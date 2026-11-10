import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CrearCanalDto } from './dto/crear-canal.dto';
import { ActualizarCanalDto } from './dto/actualizar-canal.dto';
import { ConfigurarPermisosDto } from './dto/configurar-permisos.dto';

type PermisoCanal =
  | 'puede_ver'
  | 'puede_escribir'
  | 'puede_adjuntar'
  | 'puede_administrar';

@Injectable()
export class CanalesService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('El ID no es válido');
    }

    return BigInt(id);
  }

  private async obtenerMiembro(
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

    if (!miembro) {
      throw new ForbiddenException(
        'No perteneces a esta comunidad',
      );
    }

    return miembro;
  }

  private async obtenerCanal(canalId: bigint) {
    const canal = await this.prisma.canales_comunidad.findUnique({
      where: { id: canalId },
    });

    if (!canal) {
      throw new NotFoundException('Canal no encontrado');
    }

    return canal;
  }

  private async obtenerConfiguracionPermisos(
    canalId: bigint,
    rol: string,
  ) {
    const permisos = await this.prisma.permisos_canal.findUnique({
      where: {
        canal_id_rol: {
          canal_id: canalId,
          rol: rol as any,
        },
      },
    });

    if (permisos) {
      return {
        puede_ver: permisos.puede_ver,
        puede_escribir: permisos.puede_escribir,
        puede_adjuntar: permisos.puede_adjuntar,
        puede_administrar:
          rol === 'propietario' || permisos.puede_administrar,
      };
    }

    const esAdministrador =
      rol === 'propietario' || rol === 'administrador';

    return {
      puede_ver: true,
      puede_escribir: true,
      puede_adjuntar: true,
      puede_administrar: esAdministrador,
    };
  }

  /**
   * Comprueba si un usuario tiene un permiso concreto en un canal.
   * Este método también será utilizado por MensajesService y ArchivosService.
   */
  async verificarPermiso(
    usuarioIdString: string,
    canalIdString: string,
    permiso: PermisoCanal,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    const canal = await this.obtenerCanal(canalId);

    const miembro = await this.obtenerMiembro(
      usuarioId,
      canal.comunidad_id,
    );

    const permisos = await this.obtenerConfiguracionPermisos(
      canalId,
      miembro.rol,
    );

    if (!permisos[permiso]) {
      const mensajes: Record<PermisoCanal, string> = {
        puede_ver: 'No tienes permiso para ver este canal',
        puede_escribir: 'No tienes permiso para escribir en este canal',
        puede_adjuntar: 'No tienes permiso para adjuntar archivos en este canal',
        puede_administrar: 'No tienes permiso para administrar este canal',
      };

      throw new ForbiddenException(mensajes[permiso]);
    }

    return {
      canal,
      miembro,
      permisos,
    };
  }

  private async comprobarAdministracion(
    usuarioId: bigint,
    comunidadId: bigint,
  ) {
    const miembro = await this.obtenerMiembro(
      usuarioId,
      comunidadId,
    );

    if (
      miembro.rol !== 'propietario' &&
      miembro.rol !== 'administrador'
    ) {
      throw new ForbiddenException(
        'No tienes permisos para administrar los canales',
      );
    }

    return miembro;
  }

  async crear(
    usuarioIdString: string,
    comunidadIdString: string,
    datos: CrearCanalDto,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);

    await this.comprobarAdministracion(usuarioId, comunidadId);

    const nombre = datos.nombre.trim();

    if (!nombre) {
      throw new BadRequestException(
        'El nombre del canal es obligatorio',
      );
    }

    const comunidad = await this.prisma.comunidades.findUnique({
      where: { id: comunidadId },
    });

    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    const canal = await this.prisma.canales_comunidad.create({
      data: {
        comunidad_id: comunidadId,
        nombre,
        descripcion: datos.descripcion?.trim() || null,
        tipo: datos.tipo as any,
        orden: datos.orden ?? 0,
        creado_por: usuarioId,
      },
    });

    return this.serializarCanal(canal);
  }

  async listar(
    usuarioIdString: string,
    comunidadIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const comunidadId = this.convertirId(comunidadIdString);

    const miembro = await this.obtenerMiembro(
      usuarioId,
      comunidadId,
    );

    const canales = await this.prisma.canales_comunidad.findMany({
      where: { comunidad_id: comunidadId },
      orderBy: [
        { orden: 'asc' },
        { id: 'asc' },
      ],
    });

    const canalesPermitidos = await Promise.all(
      canales.map(async (canal) => {
        const permisos = await this.obtenerConfiguracionPermisos(
          canal.id,
          miembro.rol,
        );

        return permisos.puede_ver
          ? this.serializarCanal(canal)
          : null;
      }),
    );

    return canalesPermitidos.filter(
      (canal) => canal !== null,
    );
  }

  async obtenerPorId(
    usuarioIdString: string,
    canalIdString: string,
  ) {
    const resultado = await this.verificarPermiso(
      usuarioIdString,
      canalIdString,
      'puede_ver',
    );

    return this.serializarCanal(resultado.canal);
  }

  async actualizar(
    usuarioIdString: string,
    canalIdString: string,
    datos: ActualizarCanalDto,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    const canal = await this.obtenerCanal(canalId);

    await this.comprobarAdministracion(
      usuarioId,
      canal.comunidad_id,
    );

    await this.verificarPermiso(
      usuarioIdString,
      canalIdString,
      'puede_administrar',
    );

    if (datos.nombre !== undefined && !datos.nombre.trim()) {
      throw new BadRequestException(
        'El nombre del canal no puede estar vacío',
      );
    }

    const actualizado = await this.prisma.canales_comunidad.update({
      where: { id: canalId },
      data: {
        ...(datos.nombre !== undefined
          ? { nombre: datos.nombre.trim() }
          : {}),
        ...(datos.descripcion !== undefined
          ? { descripcion: datos.descripcion.trim() || null }
          : {}),
        ...(datos.tipo !== undefined
          ? { tipo: datos.tipo as any }
          : {}),
        ...(datos.orden !== undefined
          ? { orden: datos.orden }
          : {}),
      },
    });

    return this.serializarCanal(actualizado);
  }

  async eliminar(
    usuarioIdString: string,
    canalIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    const canal = await this.obtenerCanal(canalId);

    await this.comprobarAdministracion(
      usuarioId,
      canal.comunidad_id,
    );

    await this.verificarPermiso(
      usuarioIdString,
      canalIdString,
      'puede_administrar',
    );

    await this.prisma.canales_comunidad.delete({
      where: { id: canalId },
    });

    return {
      mensaje: 'Canal eliminado correctamente',
    };
  }

  async configurarPermisos(
    usuarioIdString: string,
    canalIdString: string,
    datos: ConfigurarPermisosDto,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    const canal = await this.obtenerCanal(canalId);

    const actor = await this.comprobarAdministracion(
      usuarioId,
      canal.comunidad_id,
    );

    await this.verificarPermiso(
      usuarioIdString,
      canalIdString,
      'puede_administrar',
    );

    if (
      actor.rol === 'administrador' &&
      datos.rol === 'propietario'
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede configurar sus permisos',
      );
    }

    const permisos = await this.prisma.permisos_canal.upsert({
      where: {
        canal_id_rol: {
          canal_id: canalId,
          rol: datos.rol as any,
        },
      },
      create: {
        canal_id: canalId,
        rol: datos.rol as any,
        puede_ver: datos.puedeVer,
        puede_escribir: datos.puedeEscribir,
        puede_adjuntar: datos.puedeAdjuntar,
        puede_administrar: datos.puedeAdministrar,
      },
      update: {
        puede_ver: datos.puedeVer,
        puede_escribir: datos.puedeEscribir,
        puede_adjuntar: datos.puedeAdjuntar,
        puede_administrar: datos.puedeAdministrar,
      },
    });

    return {
      canalId: permisos.canal_id.toString(),
      rol: permisos.rol,
      puedeVer: permisos.puede_ver,
      puedeEscribir: permisos.puede_escribir,
      puedeAdjuntar: permisos.puede_adjuntar,
      puedeAdministrar: permisos.puede_administrar,
    };
  }

  async obtenerPermisos(
    usuarioIdString: string,
    canalIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const canalId = this.convertirId(canalIdString);

    const canal = await this.obtenerCanal(canalId);

    const miembro = await this.obtenerMiembro(
      usuarioId,
      canal.comunidad_id,
    );

    const permisos = await this.obtenerConfiguracionPermisos(
      canalId,
      miembro.rol,
    );

    return {
      rol: miembro.rol,
      puedeVer: permisos.puede_ver,
      puedeEscribir: permisos.puede_escribir,
      puedeAdjuntar: permisos.puede_adjuntar,
      puedeAdministrar: permisos.puede_administrar,
    };
  }

  private serializarCanal(canal: {
    id: bigint;
    comunidad_id: bigint;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    orden: number;
    creado_por: bigint;
  }) {
    return {
      id: canal.id.toString(),
      comunidadId: canal.comunidad_id.toString(),
      nombre: canal.nombre,
      descripcion: canal.descripcion,
      tipo: canal.tipo,
      orden: canal.orden,
      creadoPor: canal.creado_por.toString(),
    };
  }
}