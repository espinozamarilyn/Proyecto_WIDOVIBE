
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';

@Injectable()
export class ComunidadesService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('ID no válido');
    }

    return BigInt(id);
  }

  async crear(usuarioIdString: string, datos: CrearComunidadDto) {
    const usuarioId = this.convertirId(usuarioIdString);

    const nombre = datos.nombre.trim();

    if (!nombre) {
      throw new BadRequestException(
        'El nombre de la comunidad es obligatorio',
      );
    }

    const comunidad = await this.prisma.comunidades.create({
      data: {
        nombre,
        descripcion: datos.descripcion?.trim() || null,
        imagen: datos.imagen || null,
        categoria: datos.categoria || null,
        privacidad: datos.privacidad as any,
        creador_id: usuarioId,
        miembros_comunidad: {
          create: {
            usuario_id: usuarioId,
            rol: 'propietario',
          },
        },
      },
      include: {
        miembros_comunidad: true,
      },
    });

    return {
      id: comunidad.id.toString(),
      nombre: comunidad.nombre,
      descripcion: comunidad.descripcion,
      imagen: comunidad.imagen,
      categoria: comunidad.categoria,
      privacidad: comunidad.privacidad,
      creadorId: comunidad.creador_id.toString(),
      creadoEn: comunidad.creado_en,
    };
  }

  async listarPublicas(usuarioIdString?: string) {
    const comunidades = await this.prisma.comunidades.findMany({
      where: {
        privacidad: 'publica',
      },
      include: {
        _count: {
          select: {
            miembros_comunidad: true,
            canales_comunidad: true,
          },
        },
      },
      orderBy: {
        creado_en: 'desc',
      },
    });

    return comunidades.map((comunidad) => ({
      id: comunidad.id.toString(),
      nombre: comunidad.nombre,
      descripcion: comunidad.descripcion,
      imagen: comunidad.imagen,
      categoria: comunidad.categoria,
      privacidad: comunidad.privacidad,
      creadorId: comunidad.creador_id.toString(),
      totalMiembros: comunidad._count.miembros_comunidad,
      totalCanales: comunidad._count.canales_comunidad,
      creadoEn: comunidad.creado_en,
    }));
  }

  async obtenerPorId(
    comunidadIdString: string,
    usuarioIdString?: string,
  ) {
    const comunidadId = this.convertirId(comunidadIdString);

    const comunidad = await this.prisma.comunidades.findUnique({
      where: {
        id: comunidadId,
      },
      include: {
        _count: {
          select: {
            miembros_comunidad: true,
            canales_comunidad: true,
          },
        },
      },
    });

    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    if (comunidad.privacidad === 'privada') {
      if (!usuarioIdString) {
        throw new ForbiddenException(
          'Debes iniciar sesión para acceder a esta comunidad',
        );
      }

      const usuarioId = this.convertirId(usuarioIdString);

      const miembro = await this.prisma.miembros_comunidad.findUnique({
        where: {
          comunidad_id_usuario_id: {
            comunidad_id: comunidadId,
            usuario_id: usuarioId,
          },
        },
      });

      if (!miembro) {
        throw new ForbiddenException(
          'No perteneces a esta comunidad privada',
        );
      }
    }

    return {
      id: comunidad.id.toString(),
      nombre: comunidad.nombre,
      descripcion: comunidad.descripcion,
      imagen: comunidad.imagen,
      categoria: comunidad.categoria,
      privacidad: comunidad.privacidad,
      creadorId: comunidad.creador_id.toString(),
      totalMiembros: comunidad._count.miembros_comunidad,
      totalCanales: comunidad._count.canales_comunidad,
      creadoEn: comunidad.creado_en,
    };
  }

  async unirsePublica(
    usuarioIdString: string,
    comunidadIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);

    const comunidad = await this.prisma.comunidades.findUnique({
      where: { id: comunidadId },
    });

    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    if (comunidad.privacidad !== 'publica') {
      throw new ForbiddenException(
        'Esta comunidad requiere una solicitud de ingreso',
      );
    }

    const existente = await this.prisma.miembros_comunidad.findUnique({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: usuarioId,
        },
      },
    });

    if (existente) {
      throw new ConflictException(
        'Ya perteneces a esta comunidad',
      );
    }

    await this.prisma.miembros_comunidad.create({
      data: {
        comunidad_id: comunidadId,
        usuario_id: usuarioId,
        rol: 'miembro',
      },
    });

    return {
      mensaje: 'Te has unido a la comunidad correctamente',
    };
  }

  async solicitarIngreso(
    usuarioIdString: string,
    comunidadIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);

    const comunidad = await this.prisma.comunidades.findUnique({
      where: { id: comunidadId },
    });

    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    if (comunidad.privacidad !== 'privada') {
      throw new BadRequestException(
        'Esta comunidad es pública; puedes unirte directamente',
      );
    }

    const miembro = await this.prisma.miembros_comunidad.findUnique({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: usuarioId,
        },
      },
    });

    if (miembro) {
      throw new ConflictException(
        'Ya perteneces a esta comunidad',
      );
    }

    const solicitud = await this.prisma.solicitudes_comunidad.findUnique({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: usuarioId,
        },
      },
    });

    if (solicitud?.estado === 'pendiente') {
      throw new ConflictException(
        'Ya tienes una solicitud pendiente',
      );
    }

    if (solicitud) {
      await this.prisma.solicitudes_comunidad.update({
        where: {
          comunidad_id_usuario_id: {
            comunidad_id: comunidadId,
            usuario_id: usuarioId,
          },
        },
        data: {
          estado: 'pendiente',
          creado_en: new Date(),
          respondido_en: null,
        },
      });
    } else {
      await this.prisma.solicitudes_comunidad.create({
        data: {
          comunidad_id: comunidadId,
          usuario_id: usuarioId,
          estado: 'pendiente',
        },
      });
    }

    return {
      mensaje: 'Solicitud de ingreso enviada correctamente',
    };
  }

  async listarSolicitudes(
    usuarioIdString: string,
    comunidadIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);

    await this.comprobarAdministracion(
      usuarioId,
      comunidadId,
    );

    const solicitudes =
      await this.prisma.solicitudes_comunidad.findMany({
        where: {
          comunidad_id: comunidadId,
          estado: 'pendiente',
        },
        include: {
          usuarios: {
            select: {
              id: true,
              nombre_completo: true,
              nombre_usuario: true,
              foto_perfil: true,
            },
          },
        },
        orderBy: {
          creado_en: 'asc',
        },
      });

    return solicitudes.map((solicitud) => ({
      usuario: {
        id: solicitud.usuarios.id.toString(),
        nombre: solicitud.usuarios.nombre_completo,
        nombreUsuario: solicitud.usuarios.nombre_usuario,
        fotoPerfil: solicitud.usuarios.foto_perfil,
      },
      creadoEn: solicitud.creado_en,
    }));
  }

  async responderSolicitud(
    usuarioIdString: string,
    comunidadIdString: string,
    solicitanteIdString: string,
    aceptar: boolean,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);
    const solicitanteId = this.convertirId(solicitanteIdString);

    await this.comprobarAdministracion(
      usuarioId,
      comunidadId,
    );

    const solicitud =
      await this.prisma.solicitudes_comunidad.findUnique({
        where: {
          comunidad_id_usuario_id: {
            comunidad_id: comunidadId,
            usuario_id: solicitanteId,
          },
        },
      });

    if (!solicitud || solicitud.estado !== 'pendiente') {
      throw new NotFoundException(
        'Solicitud pendiente no encontrada',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.solicitudes_comunidad.update({
        where: {
          comunidad_id_usuario_id: {
            comunidad_id: comunidadId,
            usuario_id: solicitanteId,
          },
        },
        data: {
          estado: aceptar ? 'aceptada' : 'rechazada',
          respondido_en: new Date(),
        },
      });

      if (aceptar) {
        await tx.miembros_comunidad.create({
          data: {
            comunidad_id: comunidadId,
            usuario_id: solicitanteId,
            rol: 'miembro',
          },
        });
      }
    });

    return {
      mensaje: aceptar
        ? 'Solicitud aceptada correctamente'
        : 'Solicitud rechazada correctamente',
    };
  }

  async listarMiembros(
    usuarioIdString: string,
    comunidadIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);

    const comunidad = await this.prisma.comunidades.findUnique({
      where: { id: comunidadId },
    });

    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    if (comunidad.privacidad === 'privada') {
      const miembro = await this.prisma.miembros_comunidad.findUnique({
        where: {
          comunidad_id_usuario_id: {
            comunidad_id: comunidadId,
            usuario_id: usuarioId,
          },
        },
      });

      if (!miembro) {
        throw new ForbiddenException(
          'No tienes acceso a los miembros de esta comunidad',
        );
      }
    }

    const miembros = await this.prisma.miembros_comunidad.findMany({
      where: {
        comunidad_id: comunidadId,
      },
      include: {
        usuarios: {
          select: {
            id: true,
            nombre_completo: true,
            nombre_usuario: true,
            foto_perfil: true,
          },
        },
      },
      orderBy: {
        unido_en: 'asc',
      },
    });

    return miembros.map((miembro) => ({
      usuario: {
        id: miembro.usuarios.id.toString(),
        nombre: miembro.usuarios.nombre_completo,
        nombreUsuario: miembro.usuarios.nombre_usuario,
        fotoPerfil: miembro.usuarios.foto_perfil,
      },
      rol: miembro.rol,
      unidoEn: miembro.unido_en,
    }));
  }

  async expulsarMiembro(
    usuarioIdString: string,
    comunidadIdString: string,
    miembroIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);
    const miembroId = this.convertirId(miembroIdString);

    await this.comprobarAdministracion(
      usuarioId,
      comunidadId,
    );

    if (usuarioId === miembroId) {
      throw new BadRequestException(
        'No puedes expulsarte a ti mismo',
      );
    }

    const miembro = await this.prisma.miembros_comunidad.findUnique({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: miembroId,
        },
      },
    });

    if (!miembro) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (miembro.rol === 'propietario') {
      throw new ForbiddenException(
        'No puedes expulsar al propietario',
      );
    }

    const actor = await this.prisma.miembros_comunidad.findUnique({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: usuarioId,
        },
      },
    });

    if (
      actor?.rol === 'administrador' &&
      miembro.rol === 'administrador'
    ) {
      throw new ForbiddenException(
        'Un administrador no puede expulsar a otro administrador',
      );
    }

    await this.prisma.miembros_comunidad.delete({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: miembroId,
        },
      },
    });

    return {
      mensaje: 'Miembro expulsado correctamente',
    };
  }

  private async comprobarAdministracion(
    usuarioId: bigint,
    comunidadId: bigint,
  ) {
    const miembro = await this.prisma.miembros_comunidad.findUnique({
      where: {
        comunidad_id_usuario_id: {
          comunidad_id: comunidadId,
          usuario_id: usuarioId,
        },
      },
    });

    if (
      !miembro ||
      !['propietario', 'administrador'].includes(miembro.rol)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para administrar esta comunidad',
      );
    }

    return miembro;
  }
}
