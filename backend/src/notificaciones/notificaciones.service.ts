
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('El ID no es válido');
    }

    return BigInt(id);
  }

  async crear(
    usuarioIdString: string,
    datos: CrearNotificacionDto,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);

    const notificacion = await this.prisma.notificaciones.create({
      data: {
        usuario_id: usuarioId,
        tipo: datos.tipo,
        titulo: datos.titulo.trim(),
        contenido: datos.contenido?.trim() || null,
        referencia_id: datos.referenciaId
          ? this.convertirId(datos.referenciaId)
          : null,
        leida: false,
      },
    });

    return this.serializar(notificacion);
  }

  async listar(usuarioIdString: string) {
    const usuarioId = this.convertirId(usuarioIdString);

    const notificaciones =
      await this.prisma.notificaciones.findMany({
        where: {
          usuario_id: usuarioId,
        },
        orderBy: {
          creado_en: 'desc',
        },
        take: 100,
      });

    return notificaciones.map((notificacion) =>
      this.serializar(notificacion),
    );
  }

  async contarNoLeidas(usuarioIdString: string) {
    const usuarioId = this.convertirId(usuarioIdString);

    const total = await this.prisma.notificaciones.count({
      where: {
        usuario_id: usuarioId,
        leida: false,
      },
    });

    return {
      total,
    };
  }

  async marcarLeida(
    usuarioIdString: string,
    notificacionIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const notificacionId = this.convertirId(
      notificacionIdString,
    );

    const resultado = await this.prisma.notificaciones.updateMany({
      where: {
        id: notificacionId,
        usuario_id: usuarioId,
      },
      data: {
        leida: true,
      },
    });

    if (resultado.count === 0) {
      throw new NotFoundException(
        'Notificación no encontrada',
      );
    }

    return {
      mensaje: 'Notificación marcada como leída',
    };
  }

  async marcarTodasLeidas(usuarioIdString: string) {
    const usuarioId = this.convertirId(usuarioIdString);

    const resultado = await this.prisma.notificaciones.updateMany({
      where: {
        usuario_id: usuarioId,
        leida: false,
      },
      data: {
        leida: true,
      },
    });

    return {
      mensaje: 'Todas las notificaciones fueron marcadas como leídas',
      actualizadas: resultado.count,
    };
  }

  async eliminar(
    usuarioIdString: string,
    notificacionIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const notificacionId = this.convertirId(
      notificacionIdString,
    );

    const resultado = await this.prisma.notificaciones.deleteMany({
      where: {
        id: notificacionId,
        usuario_id: usuarioId,
      },
    });

    if (resultado.count === 0) {
      throw new NotFoundException(
        'Notificación no encontrada',
      );
    }

    return {
      mensaje: 'Notificación eliminada correctamente',
    };
  }

  private serializar(notificacion: {
    id: bigint;
    usuario_id: bigint;
    tipo: string;
    titulo: string;
    contenido: string | null;
    referencia_id: bigint | null;
    leida: boolean;
    creado_en: Date | null;
  }) {
    return {
      id: notificacion.id.toString(),
      usuarioId: notificacion.usuario_id.toString(),
      tipo: notificacion.tipo,
      titulo: notificacion.titulo,
      contenido: notificacion.contenido,
      referenciaId:
        notificacion.referencia_id?.toString() ?? null,
      leida: notificacion.leida,
      creadoEn: notificacion.creado_en,
    };
  }
}
