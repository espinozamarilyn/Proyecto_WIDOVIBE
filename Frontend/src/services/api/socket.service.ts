
import { io, type Socket } from 'socket.io-client';

import { apiService } from './api.service';

import type { Mensaje } from '../../types/mensaje.types';

interface RespuestaSocket {
  evento: string;
  mensaje?: Mensaje | string;
  resultado?: unknown;
}

interface DatosEnviar {
  conversacionId: string;
  contenido: string;
  claveIdempotencia?: string;
}

interface DatosLeer {
  conversacionId: string;
  mensajeId: string;
}

class SocketService {
  private socket: Socket | null = null;

  conectar(): Socket {
    if (this.socket) {
      return this.socket;
    }

    const apiUrl = import.meta.env.PUBLIC_API_URL;

    if (!apiUrl) {
      throw new Error(
        'No se configuró PUBLIC_API_URL.',
      );
    }

    const token = apiService.obtenerTokenGuardado();

    if (!token) {
      throw new Error(
        'No existe una sesión autenticada.',
      );
    }

    const baseUrl = new URL(apiUrl).origin;

    this.socket = io(`${baseUrl}/mensajes`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    return this.socket;
  }

  obtenerSocket(): Socket | null {
    return this.socket;
  }

  unirseConversacion(conversacionId: string): void {
    this.socket?.emit('conversacion:unirse', {
      conversacionId,
    });
  }

  salirConversacion(conversacionId: string): void {
    this.socket?.emit('conversacion:salir', {
      conversacionId,
    });
  }

  enviarMensaje(datos: DatosEnviar): Promise<Mensaje> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(
          new Error(
            'No hay conexión con el servidor de mensajes.',
          ),
        );
        return;
      }

      this.socket.emit(
        'mensaje:enviar',
        datos,
        (respuesta: RespuestaSocket) => {
          if (!respuesta) {
            reject(
              new Error(
                'El servidor no confirmó el envío.',
              ),
            );
            return;
          }

          if (respuesta.evento === 'error') {
            reject(
              new Error(
                typeof respuesta.mensaje === 'string'
                  ? respuesta.mensaje
                  : 'No se pudo enviar el mensaje.',
              ),
            );
            return;
          }

          if (
            respuesta.evento !== 'mensaje:enviado' ||
            !respuesta.mensaje ||
            typeof respuesta.mensaje === 'string'
          ) {
            reject(
              new Error(
                'Respuesta inesperada del servidor.',
              ),
            );
            return;
          }

          resolve(respuesta.mensaje);
        },
      );
    });
  }

  marcarLeido(datos: DatosLeer): void {
    this.socket?.emit('mensaje:leido', datos);
  }

  desconectar(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
