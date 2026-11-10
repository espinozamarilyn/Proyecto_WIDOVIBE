
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { MensajesService } from './mensajes.service';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';

interface UsuarioToken {
  sub: string;
}

interface DatosEnviarMensaje extends EnviarMensajeDto {
  conversacionId: string;
}

interface DatosConversacion {
  conversacionId: string;
}

interface DatosMensajeLeido {
  conversacionId: string;
  mensajeId: string;
}

const origenesFrontend = (
  process.env.FRONTEND_URL ||
  'http://localhost:4321,http://localhost:4322'
)
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

@WebSocketGateway({
  namespace: '/mensajes',
  cors: {
    origin: origenesFrontend,
    credentials: true,
  },
})
export class MensajesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly mensajesService: MensajesService,
  ) {}

  // ==========================================
  // AUTENTICAR CONEXIÓN
  // ==========================================

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.obtenerToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload =
        await this.jwtService.verifyAsync<UsuarioToken>(token);

      if (!payload.sub || !/^[1-9]\d*$/.test(payload.sub)) {
        client.disconnect();
        return;
      }

      client.data.usuarioId = payload.sub;

      await client.join(`usuario:${payload.sub}`);

      client.emit('conexion:establecida', {
        conectado: true,
        usuarioId: payload.sub,
      });
    } catch {
      client.disconnect();
    }
  }

  // ==========================================
  // DESCONECTAR
  // ==========================================

  handleDisconnect(client: Socket): void {
    const usuarioId = client.data.usuarioId;

    if (usuarioId) {
      console.log(
        `Usuario ${usuarioId} desconectado de mensajes`,
      );
    }
  }

  // ==========================================
  // UNIRSE A UNA CONVERSACIÓN
  // ==========================================

  @SubscribeMessage('conversacion:unirse')
  async unirseConversacion(
    @ConnectedSocket() client: Socket,
    @MessageBody() datos: DatosConversacion,
  ) {
    try {
      const usuarioId = client.data.usuarioId as string;

      if (!usuarioId || !datos?.conversacionId) {
        throw new Error('Datos de conversación no válidos');
      }

      await this.mensajesService.listarMensajes(
        usuarioId,
        datos.conversacionId,
        '1',
      );

      const sala = `conversacion:${datos.conversacionId}`;

      await client.join(sala);

      return {
        evento: 'conversacion:unida',
        conversacionId: datos.conversacionId,
        conectado: true,
      };
    } catch (error) {
      return {
        evento: 'error',
        mensaje:
          error instanceof Error
            ? error.message
            : 'No se pudo ingresar a la conversación',
      };
    }
  }

  // ==========================================
  // SALIR DE UNA CONVERSACIÓN
  // ==========================================

  @SubscribeMessage('conversacion:salir')
  async salirConversacion(
    @ConnectedSocket() client: Socket,
    @MessageBody() datos: DatosConversacion,
  ) {
    if (!datos?.conversacionId) {
      return {
        evento: 'error',
        mensaje: 'El ID de la conversación es obligatorio',
      };
    }

    await client.leave(
      `conversacion:${datos.conversacionId}`,
    );

    return {
      evento: 'conversacion:salida',
      conversacionId: datos.conversacionId,
    };
  }

  // ==========================================
  // ENVIAR MENSAJE EN TIEMPO REAL
  // ==========================================

  @SubscribeMessage('mensaje:enviar')
  async enviarMensaje(
    @ConnectedSocket() client: Socket,
    @MessageBody() datos: DatosEnviarMensaje,
  ) {
    try {
      const usuarioId = client.data.usuarioId as string;

      if (!usuarioId) {
        throw new Error('Usuario no autenticado');
      }

      if (!datos?.conversacionId) {
        throw new Error(
          'El ID de la conversación es obligatorio',
        );
      }

      const sala = `conversacion:${datos.conversacionId}`;

      if (!client.rooms.has(sala)) {
        throw new Error(
          'Primero debes ingresar a la conversación',
        );
      }

      const mensaje = await this.mensajesService.enviarMensaje(
        usuarioId,
        datos.conversacionId,
        {
          contenido: datos.contenido,
          claveIdempotencia: datos.claveIdempotencia,
        },
      );

      this.server.to(sala).emit('mensaje:nuevo', mensaje);

      return {
        evento: 'mensaje:enviado',
        mensaje,
      };
    } catch (error) {
      return {
        evento: 'error',
        mensaje:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar el mensaje',
      };
    }
  }

  // ==========================================
  // MARCAR MENSAJE COMO LEÍDO
  // ==========================================

  @SubscribeMessage('mensaje:leido')
  async marcarLeido(
    @ConnectedSocket() client: Socket,
    @MessageBody() datos: DatosMensajeLeido,
  ) {
    try {
      const usuarioId = client.data.usuarioId as string;

      if (!usuarioId) {
        throw new Error('Usuario no autenticado');
      }

      if (!datos?.conversacionId || !datos?.mensajeId) {
        throw new Error('Datos del mensaje no válidos');
      }

      const resultado = await this.mensajesService.marcarLeido(
        usuarioId,
        datos.conversacionId,
        datos.mensajeId,
      );

      const evento = {
        ...resultado,
        usuarioId,
      };

      this.server
        .to(`conversacion:${datos.conversacionId}`)
        .emit('mensaje:estado', evento);

      return {
        evento: 'mensaje:leido:confirmado',
        resultado,
      };
    } catch (error) {
      return {
        evento: 'error',
        mensaje:
          error instanceof Error
            ? error.message
            : 'No se pudo marcar el mensaje como leído',
      };
    }
  }

  // ==========================================
  // OBTENER TOKEN JWT
  // ==========================================

  private obtenerToken(client: Socket): string | null {
    const tokenAuth = client.handshake.auth?.token;

    if (typeof tokenAuth === 'string' && tokenAuth.trim()) {
      return tokenAuth
        .replace(/^Bearer\s+/i, '')
        .trim();
    }

    const authorization =
      client.handshake.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.substring(7).trim();
    }

    return null;
  }
}
