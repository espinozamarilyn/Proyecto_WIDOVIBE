import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface ActualizarConfiguracionDto {
  privacidad_perfil?: 'publico' | 'contactos' | 'privado';
  quien_puede_contactar?: 'todos' | 'contactos' | 'nadie';
  mostrar_estado_conexion?: boolean;
  notificaciones_activadas?: boolean;
}

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(usuarioId: string): bigint {
    try {
      const id = BigInt(usuarioId);

      if (id <= 0n) {
        throw new Error();
      }

      return id;
    } catch {
      throw new BadRequestException('ID de usuario inválido');
    }
  }

  async obtener(usuarioId: string) {
    const id = this.convertirId(usuarioId);

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const configuracion =
      await this.prisma.configuracion_usuario.upsert({
        where: { usuario_id: id },
        create: {
          usuario_id: id,
        },
        update: {},
      });

    return {
      ...configuracion,
      usuario_id: configuracion.usuario_id.toString(),
    };
  }

  async actualizar(
    usuarioId: string,
    dto: ActualizarConfiguracionDto,
  ) {
    const id = this.convertirId(usuarioId);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debes proporcionar al menos una configuración',
      );
    }

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const configuracion =
      await this.prisma.configuracion_usuario.upsert({
        where: { usuario_id: id },

        create: {
          usuario_id: id,
          ...(dto.privacidad_perfil !== undefined && {
            privacidad_perfil: dto.privacidad_perfil as never,
          }),
          ...(dto.quien_puede_contactar !== undefined && {
            quien_puede_contactar: dto.quien_puede_contactar as never,
          }),
          ...(dto.mostrar_estado_conexion !== undefined && {
            mostrar_estado_conexion: dto.mostrar_estado_conexion,
          }),
          ...(dto.notificaciones_activadas !== undefined && {
            notificaciones_activadas: dto.notificaciones_activadas,
          }),
        },

        update: {
          ...(dto.privacidad_perfil !== undefined && {
            privacidad_perfil: dto.privacidad_perfil as never,
          }),
          ...(dto.quien_puede_contactar !== undefined && {
            quien_puede_contactar: dto.quien_puede_contactar as never,
          }),
          ...(dto.mostrar_estado_conexion !== undefined && {
            mostrar_estado_conexion: dto.mostrar_estado_conexion,
          }),
          ...(dto.notificaciones_activadas !== undefined && {
            notificaciones_activadas: dto.notificaciones_activadas,
          }),
        },
      });

    return {
      ...configuracion,
      usuario_id: configuracion.usuario_id.toString(),
    };
  }
}