import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    try {
      const convertido = BigInt(id);

      if (convertido <= 0n) {
        throw new Error();
      }

      return convertido;
    } catch {
      throw new BadRequestException('ID de usuario inválido');
    }
  }

  async obtenerPerfil(usuarioId: string) {
    const id = this.convertirId(usuarioId);

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        correo: true,
        foto_perfil: true,
        biografia: true,
        estado: true,
        rol: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.formatearUsuario(usuario);
  }

  async actualizarPerfil(
    usuarioId: string,
    dto: ActualizarPerfilDto,
  ) {
    const id = this.convertirId(usuarioId);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debes proporcionar al menos un campo para actualizar',
      );
    }

    if (dto.nombre_usuario) {
      const existente = await this.prisma.usuarios.findFirst({
        where: {
          nombre_usuario: dto.nombre_usuario,
          NOT: { id },
        },
      });

      if (existente) {
        throw new ConflictException(
          'El nombre de usuario ya está registrado',
        );
      }
    }

    const usuario = await this.prisma.usuarios.update({
      where: { id },
      data: {
        ...(dto.nombre_completo !== undefined && {
          nombre_completo: dto.nombre_completo,
        }),
        ...(dto.nombre_usuario !== undefined && {
          nombre_usuario: dto.nombre_usuario,
        }),
        ...(dto.foto_perfil !== undefined && {
          foto_perfil: dto.foto_perfil,
        }),
        ...(dto.biografia !== undefined && {
          biografia: dto.biografia,
        }),
      },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        correo: true,
        foto_perfil: true,
        biografia: true,
        estado: true,
        rol: true,
      },
    });

    return this.formatearUsuario(usuario);
  }

  async buscarUsuarios(busqueda: string, usuarioId: string) {
    const id = this.convertirId(usuarioId);

    const termino = busqueda?.trim();

    if (!termino || termino.length < 2) {
      throw new BadRequestException(
        'La búsqueda debe contener al menos 2 caracteres',
      );
    }

    const usuarios = await this.prisma.usuarios.findMany({
      where: {
        id: { not: id },
        estado: 'activo',
        OR: [
          {
            nombre_usuario: {
              contains: termino,
            },
          },
          {
            nombre_completo: {
              contains: termino,
            },
          },
        ],
      },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        foto_perfil: true,
        biografia: true,
      },
      orderBy: {
        nombre_usuario: 'asc',
      },
      take: 20,
    });

    return usuarios.map((usuario) => this.formatearUsuario(usuario));
  }

  private formatearUsuario(usuario: any) {
    return {
      ...usuario,
      id: usuario.id.toString(),
    };
  }
}