import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CanalesService } from '../canales/canales.service';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';

@Injectable()
export class MensajesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canalesService: CanalesService,
  ) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('El ID no es válido');
    }

    return BigInt(id);
  }

  private async comprobarParticipacion(
    usuarioId: bigint,
    conversacionId: bigint,
  ) {
    const participante =
      await this.prisma.participantes_conversacion.findUnique({
        where: {
          conversacion_id_usuario_id: {
            conversacion_id: conversacionId,
            usuario_id: usuarioId,
          },
        },
      });

    if (!participante || participante.retirado_en !== null) {
      throw new ForbiddenException(
        'No tienes acceso a esta conversación',
      );
    }

    return participante;
  }

  async enviarMensaje(
    usuarioIdString: string,
    conversacionIdString: string,
    datos: EnviarMensajeDto,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const conversacionId = this.convertirId(conversacionIdString);

    const participante = await this.comprobarParticipacion(
      usuarioId,
      conversacionId,
    );

    if (!participante.puede_enviar_mensajes) {
      throw new ForbiddenException(
        'No tienes permiso para enviar mensajes',
      );
    }

    const contenido = datos.contenido.trim();

    if (!contenido) {
      throw new BadRequestException(
        'El mensaje no puede estar vacío',
      );
    }

    if (datos.claveIdempotencia) {
      const mensajeExistente = await this.prisma.mensajes.findFirst({
        where: {
          remitente_id: usuarioId,
          clave_idempotencia: datos.claveIdempotencia,
        },
        select: {
          id: true,
          conversacion_id: true,
          remitente_id: true,
          contenido: true,
          tipo: true,
          creado_en: true,
        },
      });

      if (mensajeExistente) {
        if (mensajeExistente.conversacion_id !== conversacionId) {
          throw new BadRequestException(
            'La clave de idempotencia ya fue utilizada',
          );
        }

        return this.serializarMensaje(mensajeExistente);
      }
    }

    const mensaje = await this.prisma.$transaction(async (tx) => {
      const nuevoMensaje = await tx.mensajes.create({
        data: {
          conversacion_id: conversacionId,
          remitente_id: usuarioId,
          contenido,
          tipo: 'texto',
          clave_idempotencia: datos.claveIdempotencia ?? null,
        },
        select: {
          id: true,
          conversacion_id: true,
          remitente_id: true,
          contenido: true,
          tipo: true,
          creado_en: true,
        },
      });

      const participantes =
        await tx.participantes_conversacion.findMany({
          where: {
            conversacion_id: conversacionId,
            usuario_id: { not: usuarioId },
            retirado_en: null,
          },
          select: { usuario_id: true },
        });

      if (participantes.length > 0) {
        await tx.mensaje_destinatarios.createMany({
          data: participantes.map((participante) => ({
            mensaje_id: nuevoMensaje.id,
            destinatario_id: participante.usuario_id,
          })),
        });
      }

      return nuevoMensaje;
    });

    return this.serializarMensaje(mensaje);
  }

  async listarMensajes(
    usuarioIdString: string,
    conversacionIdString: string,
    limiteString?: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const conversacionId = this.convertirId(conversacionIdString);

    await this.comprobarParticipacion(usuarioId, conversacionId);

    const limite = this.validarLimite(limiteString);

    const mensajes = await this.prisma.mensajes.findMany({
      where: {
        conversacion_id: conversacionId,
        eliminado_en: null,
      },
      orderBy: { creado_en: 'desc' },
      take: limite,
      select: {
        id: true,
        conversacion_id: true,
        remitente_id: true,
        contenido: true,
        tipo: true,
        creado_en: true,
        editado_en: true,
        mensaje_destinatarios: {
          where: { destinatario_id: usuarioId },
          select: {
            entregado_en: true,
            leido_en: true,
          },
        },
      },
    });

    return mensajes.reverse().map((mensaje) => ({
      id: mensaje.id.toString(),
      conversacionId: mensaje.conversacion_id?.toString() ?? null,
      remitenteId: mensaje.remitente_id.toString(),
      contenido: mensaje.contenido,
      tipo: mensaje.tipo,
      creadoEn: mensaje.creado_en,
      editadoEn: mensaje.editado_en,
      entregadoEn:
        mensaje.mensaje_destinatarios[0]?.entregado_en ?? null,
      leidoEn:
        mensaje.mensaje_destinatarios[0]?.leido_en ?? null,
    }));
  }

  // Enviar un mensaje a un canal comunitario.
  async enviarMensajeCanal(
    usuarioIdString: string,
    canalIdString: string,
    datos: EnviarMensajeDto,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    await this.canalesService.verificarPermiso(
      usuarioIdString,
      canalIdString,
      'puede_escribir',
    );

    const contenido = datos.contenido.trim();

    if (!contenido) {
      throw new BadRequestException(
        'El mensaje no puede estar vacío',
      );
    }

    if (datos.claveIdempotencia) {
      const existente = await this.prisma.mensajes.findFirst({
        where: {
          remitente_id: usuarioId,
          clave_idempotencia: datos.claveIdempotencia,
        },
        select: {
          id: true,
          canal_id: true,
          conversacion_id: true,
          remitente_id: true,
          contenido: true,
          tipo: true,
          creado_en: true,
        },
      });

      if (existente) {
        if (
          existente.canal_id !== canalId ||
          existente.conversacion_id !== null
        ) {
          throw new BadRequestException(
            'La clave de idempotencia ya fue utilizada',
          );
        }

        return this.serializarMensaje(existente);
      }
    }

    const mensaje = await this.prisma.mensajes.create({
      data: {
        canal_id: canalId,
        remitente_id: usuarioId,
        contenido,
        tipo: 'texto',
        clave_idempotencia: datos.claveIdempotencia ?? null,
      },
      select: {
        id: true,
        conversacion_id: true,
        remitente_id: true,
        contenido: true,
        tipo: true,
        creado_en: true,
      },
    });

    return this.serializarMensaje(mensaje);
  }

  // Consultar mensajes de un canal.
  async listarMensajesCanal(
    usuarioIdString: string,
    canalIdString: string,
    limiteString?: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    await this.canalesService.verificarPermiso(
      usuarioIdString,
      canalIdString,
      'puede_ver',
    );

    const limite = this.validarLimite(limiteString);

    const mensajes = await this.prisma.mensajes.findMany({
      where: {
        canal_id: canalId,
        eliminado_en: null,
      },
      orderBy: { creado_en: 'desc' },
      take: limite,
      select: {
        id: true,
        canal_id: true,
        remitente_id: true,
        contenido: true,
        tipo: true,
        creado_en: true,
        editado_en: true,
      },
    });

    return mensajes.reverse().map((mensaje) => ({
      id: mensaje.id.toString(),
      canalId: mensaje.canal_id?.toString() ?? null,
      remitenteId: mensaje.remitente_id.toString(),
      contenido: mensaje.contenido,
      tipo: mensaje.tipo,
      creadoEn: mensaje.creado_en,
      editadoEn: mensaje.editado_en,
    }));
  }

  private validarLimite(limiteString?: string): number {
    const limite = limiteString ? Number(limiteString) : 50;

    if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
      throw new BadRequestException(
        'El límite debe estar entre 1 y 100',
      );
    }

    return limite;
  }

  async marcarEntregado(
    usuarioIdString: string,
    conversacionIdString: string,
    mensajeIdString: string,
  ) {
    return this.actualizarEstadoDestinatario(
      usuarioIdString,
      conversacionIdString,
      mensajeIdString,
      'entregado',
    );
  }

  async marcarLeido(
    usuarioIdString: string,
    conversacionIdString: string,
    mensajeIdString: string,
  ) {
    return this.actualizarEstadoDestinatario(
      usuarioIdString,
      conversacionIdString,
      mensajeIdString,
      'leido',
    );
  }

  private async actualizarEstadoDestinatario(
    usuarioIdString: string,
    conversacionIdString: string,
    mensajeIdString: string,
    estado: 'entregado' | 'leido',
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const conversacionId = this.convertirId(conversacionIdString);
    const mensajeId = this.convertirId(mensajeIdString);

    await this.comprobarParticipacion(usuarioId, conversacionId);

    const mensaje = await this.prisma.mensajes.findFirst({
      where: {
        id: mensajeId,
        conversacion_id: conversacionId,
        eliminado_en: null,
      },
      select: {
        id: true,
        remitente_id: true,
      },
    });

    if (!mensaje) {
      throw new NotFoundException('El mensaje no existe');
    }

    if (mensaje.remitente_id === usuarioId) {
      throw new BadRequestException(
        'No puedes marcar tus propios mensajes como recibidos',
      );
    }

    const ahora = new Date();

    const actualizado =
      await this.prisma.mensaje_destinatarios.updateMany({
        where: {
          mensaje_id: mensajeId,
          destinatario_id: usuarioId,
          ...(estado === 'entregado'
            ? { entregado_en: null }
            : { leido_en: null }),
        },
        data:
          estado === 'entregado'
            ? { entregado_en: ahora }
            : {
                entregado_en: ahora,
                leido_en: ahora,
              },
      });

    return {
      mensajeId: mensajeId.toString(),
      estado,
      actualizado: actualizado.count > 0,
      fecha: ahora,
    };
  }

  private serializarMensaje(mensaje: {
    id: bigint;
    conversacion_id: bigint | null;
    remitente_id: bigint;
    contenido: string | null;
    tipo: string;
    creado_en: Date | null;
  }) {
    return {
      id: mensaje.id.toString(),
      conversacionId: mensaje.conversacion_id?.toString() ?? null,
      remitenteId: mensaje.remitente_id.toString(),
      contenido: mensaje.contenido,
      tipo: mensaje.tipo,
      creadoEn: mensaje.creado_en,
    };
  }
}