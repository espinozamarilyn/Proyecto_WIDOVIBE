import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  reportes_estado,
  usuarios_rol,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CrearReporteDto } from './dto/crear-reporte.dto';
import { ActualizarReporteDto } from './dto/actualizar-reporte.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('El identificador no es válido');
    }

    return BigInt(id);
  }

  private async verificarAdministrador(usuarioId: bigint): Promise<void> {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: { rol: true },
    });

    if (!usuario || usuario.rol !== usuarios_rol.administrador) {
      throw new ForbiddenException(
        'Solo los administradores pueden realizar esta acción',
      );
    }
  }

  private serializar(reporte: any) {
    return {
      id: reporte.id.toString(),
      reportanteId: reporte.reportante_id.toString(),
      usuarioReportadoId:
        reporte.usuario_reportado_id?.toString() ?? null,
      mensajeReportadoId:
        reporte.mensaje_reportado_id?.toString() ?? null,
      motivo: reporte.motivo,
      descripcion: reporte.descripcion,
      estado: reporte.estado,
      resolucion: reporte.resolucion,
      revisadoPor: reporte.revisado_por?.toString() ?? null,
      creadoEn: reporte.creado_en,
      resueltoEn: reporte.resuelto_en,
    };
  }

  async crear(
    reportanteIdString: string,
    datos: CrearReporteDto,
  ) {
    const reportanteId = this.convertirId(reportanteIdString);

    const tieneUsuario = !!datos.usuarioReportadoId;
    const tieneMensaje = !!datos.mensajeReportadoId;

    if (tieneUsuario === tieneMensaje) {
      throw new BadRequestException(
        'Debes reportar exactamente un usuario o un mensaje',
      );
    }

    if (tieneUsuario) {
      const usuarioReportadoId = this.convertirId(
        datos.usuarioReportadoId!,
      );

      if (usuarioReportadoId === reportanteId) {
        throw new BadRequestException(
          'No puedes reportarte a ti mismo',
        );
      }

      const usuario = await this.prisma.usuarios.findUnique({
        where: { id: usuarioReportadoId },
        select: { id: true },
      });

      if (!usuario) {
        throw new NotFoundException('El usuario reportado no existe');
      }

      const reporte = await this.prisma.reportes.create({
        data: {
          reportante_id: reportanteId,
          usuario_reportado_id: usuarioReportadoId,
          motivo: datos.motivo,
          descripcion: datos.descripcion?.trim() || null,
        },
      });

      return this.serializar(reporte);
    }

    const mensajeId = this.convertirId(datos.mensajeReportadoId!);

    const mensaje = await this.prisma.mensajes.findUnique({
      where: { id: mensajeId },
      select: {
        id: true,
        remitente_id: true,
      },
    });

    if (!mensaje) {
      throw new NotFoundException('El mensaje reportado no existe');
    }

    if (mensaje.remitente_id === reportanteId) {
      throw new BadRequestException(
        'No puedes reportar uno de tus propios mensajes',
      );
    }

    const reporte = await this.prisma.reportes.create({
      data: {
        reportante_id: reportanteId,
        mensaje_reportado_id: mensajeId,
        motivo: datos.motivo,
        descripcion: datos.descripcion?.trim() || null,
      },
    });

    return this.serializar(reporte);
  }

  async listarMios(usuarioIdString: string) {
    const usuarioId = this.convertirId(usuarioIdString);

    const reportes = await this.prisma.reportes.findMany({
      where: { reportante_id: usuarioId },
      orderBy: { creado_en: 'desc' },
    });

    return reportes.map((reporte) => this.serializar(reporte));
  }

  async listarTodos(usuarioIdString: string) {
    const administradorId = this.convertirId(usuarioIdString);

    await this.verificarAdministrador(administradorId);

    const reportes = await this.prisma.reportes.findMany({
      orderBy: { creado_en: 'desc' },
    });

    return reportes.map((reporte) => this.serializar(reporte));
  }

  async actualizar(
    administradorIdString: string,
    reporteIdString: string,
    datos: ActualizarReporteDto,
  ) {
    const administradorId = this.convertirId(administradorIdString);
    const reporteId = this.convertirId(reporteIdString);

    await this.verificarAdministrador(administradorId);

    const reporte = await this.prisma.reportes.findUnique({
      where: { id: reporteId },
    });

    if (!reporte) {
      throw new NotFoundException('El reporte no existe');
    }

    if (
      datos.estado !== reportes_estado.en_revision &&
      datos.estado !== reportes_estado.resuelto
    ) {
      throw new BadRequestException(
        'El estado debe ser en_revision o resuelto',
      );
    }

    if (
      datos.estado === reportes_estado.resuelto &&
      !datos.resolucion?.trim()
    ) {
      throw new BadRequestException(
        'Debes escribir una resolución para cerrar el reporte',
      );
    }

    const actualizado = await this.prisma.reportes.update({
      where: { id: reporteId },
      data: {
        estado: datos.estado,
        resolucion: datos.resolucion?.trim() || null,
        revisado_por: administradorId,
        resuelto_en:
          datos.estado === reportes_estado.resuelto
            ? new Date()
            : null,
      },
    });

    return this.serializar(actualizado);
  }
}