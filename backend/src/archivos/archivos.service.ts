import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CanalesService } from '../canales/canales.service';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class ArchivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canalesService: CanalesService,
  ) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException(
        'El identificador no es válido',
      );
    }

    return BigInt(id);
  }

  private async verificarAccesoMensaje(
    mensajeId: bigint,
    usuarioId: bigint,
  ) {
    const mensaje = await this.prisma.mensajes.findUnique({
      where: { id: mensajeId },
      select: {
        id: true,
        remitente_id: true,
        conversacion_id: true,
        canal_id: true,
      },
    });

    if (!mensaje) {
      throw new NotFoundException('El mensaje no existe');
    }

    // Los mensajes de canales deben respetar el permiso de lectura.
    if (mensaje.canal_id !== null) {
      await this.canalesService.verificarPermiso(
        usuarioId.toString(),
        mensaje.canal_id.toString(),
        'puede_ver',
      );

      return mensaje;
    }

    if (mensaje.remitente_id === usuarioId) {
      return mensaje;
    }

    if (mensaje.conversacion_id !== null) {
      const participante =
        await this.prisma.participantes_conversacion.findUnique({
          where: {
            conversacion_id_usuario_id: {
              conversacion_id: mensaje.conversacion_id,
              usuario_id: usuarioId,
            },
          },
          select: { retirado_en: true },
        });

      if (participante && participante.retirado_en === null) {
        return mensaje;
      }
    }

    throw new ForbiddenException(
      'No tienes permiso para acceder a los archivos de este mensaje',
    );
  }

  async crear(
    usuarioIdString: string,
    mensajeIdString: string,
    archivo: Express.Multer.File,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const mensajeId = this.convertirId(mensajeIdString);

    if (!archivo) {
      throw new BadRequestException(
        'Debes seleccionar un archivo',
      );
    }

    try {
      const mensaje = await this.prisma.mensajes.findUnique({
        where: { id: mensajeId },
        select: {
          id: true,
          remitente_id: true,
          canal_id: true,
        },
      });

      if (!mensaje) {
        throw new NotFoundException('El mensaje no existe');
      }

      // Para canales, comprobar primero el permiso de adjuntar.
      if (mensaje.canal_id !== null) {
        await this.canalesService.verificarPermiso(
          usuarioIdString,
          mensaje.canal_id.toString(),
          'puede_adjuntar',
        );
      }

      if (mensaje.remitente_id !== usuarioId) {
        throw new ForbiddenException(
          'Solo puedes adjuntar archivos a tus propios mensajes',
        );
      }

      const adjunto = await this.prisma.archivos_adjuntos.create({
        data: {
          mensaje_id: mensajeId,
          nombre_original: archivo.originalname,
          nombre_almacenado: archivo.filename,
          ruta_archivo: archivo.path,
          tipo_mime: archivo.mimetype,
          tamano_bytes: BigInt(archivo.size),
          estado_validacion: 'pendiente',
        },
      });

      return this.serializar(adjunto);
    } catch (error) {
      if (existsSync(archivo.path)) {
        unlinkSync(archivo.path);
      }

      throw error;
    }
  }

  async listarPorMensaje(
    usuarioIdString: string,
    mensajeIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const mensajeId = this.convertirId(mensajeIdString);

    await this.verificarAccesoMensaje(mensajeId, usuarioId);

    const archivos = await this.prisma.archivos_adjuntos.findMany({
      where: { mensaje_id: mensajeId },
      orderBy: { creado_en: 'asc' },
    });

    return archivos.map((archivo) => this.serializar(archivo));
  }

  async obtenerParaDescargar(
    usuarioIdString: string,
    archivoIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const archivoId = this.convertirId(archivoIdString);

    const archivo = await this.prisma.archivos_adjuntos.findUnique({
      where: { id: archivoId },
    });

    if (!archivo) {
      throw new NotFoundException(
        'El archivo adjunto no existe',
      );
    }

    await this.verificarAccesoMensaje(
      archivo.mensaje_id,
      usuarioId,
    );

    if (!existsSync(archivo.ruta_archivo)) {
      throw new NotFoundException(
        'El archivo físico no existe',
      );
    }

    return archivo;
  }

  async eliminar(
    usuarioIdString: string,
    archivoIdString: string,
  ) {
    const usuarioId = this.convertirId(usuarioIdString);
    const archivoId = this.convertirId(archivoIdString);

    const archivo = await this.prisma.archivos_adjuntos.findUnique({
      where: { id: archivoId },
      include: {
        mensajes: {
          select: {
            remitente_id: true,
            canal_id: true,
          },
        },
      },
    });

    if (!archivo) {
      throw new NotFoundException(
        'El archivo adjunto no existe',
      );
    }

    if (archivo.mensajes.canal_id !== null) {
      await this.canalesService.verificarPermiso(
        usuarioIdString,
        archivo.mensajes.canal_id.toString(),
        'puede_ver',
      );
    }

    if (archivo.mensajes.remitente_id !== usuarioId) {
      throw new ForbiddenException(
        'Solo el autor del mensaje puede eliminar este archivo',
      );
    }

    await this.prisma.archivos_adjuntos.delete({
      where: { id: archivoId },
    });

    if (existsSync(archivo.ruta_archivo)) {
      unlinkSync(archivo.ruta_archivo);
    }

    return {
      mensaje: 'Archivo adjunto eliminado correctamente',
      id: archivoId.toString(),
    };
  }

  private serializar(archivo: any) {
    return {
      id: archivo.id.toString(),
      mensajeId: archivo.mensaje_id.toString(),
      nombreOriginal: archivo.nombre_original,
      nombreAlmacenado: archivo.nombre_almacenado,
      tipoMime: archivo.tipo_mime,
      tamanoBytes: archivo.tamano_bytes.toString(),
      estadoValidacion: archivo.estado_validacion,
      creadoEn: archivo.creado_en,
    };
  }
}