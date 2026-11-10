import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BloqueosService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    return BigInt(id);
  }

  // ==========================================
  // BLOQUEAR USUARIO
  // ==========================================
  async bloquearUsuario(usuarioId: string, bloqueadoId: string) {
    const usuario = this.convertirId(usuarioId);
    const bloqueado = this.convertirId(bloqueadoId);

    if (usuario === bloqueado) {
      throw new BadRequestException(
        'No puedes bloquearte a ti mismo',
      );
    }

    const usuarioDestino = await this.prisma.usuarios.findUnique({
      where: { id: bloqueado },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        estado: true,
      },
    });

    if (!usuarioDestino || usuarioDestino.estado !== 'activo') {
      throw new NotFoundException('Usuario no encontrado');
    }

    const bloqueoExistente = await this.prisma.bloqueos.findUnique({
      where: {
        usuario_id_bloqueado_id: {
          usuario_id: usuario,
          bloqueado_id: bloqueado,
        },
      },
    });

    if (bloqueoExistente) {
      throw new ConflictException('Este usuario ya está bloqueado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bloqueos.create({
        data: {
          usuario_id: usuario,
          bloqueado_id: bloqueado,
        },
      });

      // Eliminar solicitudes y contactos en ambas direcciones.
      await tx.solicitudes_contacto.deleteMany({
        where: {
          OR: [
            {
              remitente_id: usuario,
              destinatario_id: bloqueado,
            },
            {
              remitente_id: bloqueado,
              destinatario_id: usuario,
            },
          ],
        },
      });
    });

    return {
      mensaje: 'Usuario bloqueado correctamente',
      usuario: {
        id: usuarioDestino.id.toString(),
        nombre_completo: usuarioDestino.nombre_completo,
        nombre_usuario: usuarioDestino.nombre_usuario,
      },
    };
  }

  // ==========================================
  // LISTAR USUARIOS BLOQUEADOS
  // ==========================================
  async listarBloqueados(usuarioId: string) {
    const usuario = this.convertirId(usuarioId);

    const bloqueos = await this.prisma.bloqueos.findMany({
      where: {
        usuario_id: usuario,
      },
      include: {
        usuarios_bloqueos_bloqueado_idTousuarios: {
          select: {
            id: true,
            nombre_completo: true,
            nombre_usuario: true,
            foto_perfil: true,
            biografia: true,
          },
        },
      },
      orderBy: {
        creado_en: 'desc',
      },
    });

    return bloqueos.map((bloqueo) => {
      const bloqueado =
        bloqueo.usuarios_bloqueos_bloqueado_idTousuarios;

      return {
        id: bloqueado.id.toString(),
        nombre_completo: bloqueado.nombre_completo,
        nombre_usuario: bloqueado.nombre_usuario,
        foto_perfil: bloqueado.foto_perfil,
        biografia: bloqueado.biografia,
        bloqueado_en: bloqueo.creado_en,
      };
    });
  }

  // ==========================================
  // DESBLOQUEAR USUARIO
  // ==========================================
  async desbloquearUsuario(
    usuarioId: string,
    bloqueadoId: string,
  ) {
    const usuario = this.convertirId(usuarioId);
    const bloqueado = this.convertirId(bloqueadoId);

    const bloqueo = await this.prisma.bloqueos.findUnique({
      where: {
        usuario_id_bloqueado_id: {
          usuario_id: usuario,
          bloqueado_id: bloqueado,
        },
      },
    });

    if (!bloqueo) {
      throw new NotFoundException(
        'Este usuario no se encuentra bloqueado',
      );
    }

    await this.prisma.bloqueos.delete({
      where: {
        usuario_id_bloqueado_id: {
          usuario_id: usuario,
          bloqueado_id: bloqueado,
        },
      },
    });

    return {
      mensaje: 'Usuario desbloqueado correctamente',
    };
  }

  // ==========================================
  // COMPROBAR SI EXISTE UN BLOQUEO
  // ==========================================
  async comprobarBloqueo(
    usuarioId: string,
    otroUsuarioId: string,
  ): Promise<boolean> {
    const usuario = this.convertirId(usuarioId);
    const otroUsuario = this.convertirId(otroUsuarioId);

    const bloqueo = await this.prisma.bloqueos.findFirst({
      where: {
        OR: [
          {
            usuario_id: usuario,
            bloqueado_id: otroUsuario,
          },
          {
            usuario_id: otroUsuario,
            bloqueado_id: usuario,
          },
        ],
      },
    });

    return Boolean(bloqueo);
  }
}