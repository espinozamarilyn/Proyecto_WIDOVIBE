import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class ContactosService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // ENVIAR SOLICITUD DE CONTACTO
  // ==========================================
  async enviarSolicitud(
    remitenteId: string,
    destinatarioId: string,
  ) {
    const remitente = BigInt(remitenteId);
    const destinatario = BigInt(destinatarioId);

    if (remitente === destinatario) {
      throw new BadRequestException(
        'No puedes enviarte una solicitud a ti mismo',
      );
    }

    const usuarioDestino = await this.prisma.usuarios.findUnique({
      where: { id: destinatario },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        estado: true,
      },
    });

    if (!usuarioDestino || usuarioDestino.estado !== 'activo') {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    // Verificar bloqueos en ambas direcciones
    const bloqueo = await this.prisma.bloqueos.findFirst({
      where: {
        OR: [
          {
            usuario_id: remitente,
            bloqueado_id: destinatario,
          },
          {
            usuario_id: destinatario,
            bloqueado_id: remitente,
          },
        ],
      },
    });

    if (bloqueo) {
      throw new ForbiddenException(
        'No puedes enviar una solicitud a este usuario',
      );
    }

    // Verificar si ya existe una solicitud en la dirección original
    const solicitudExistente =
      await this.prisma.solicitudes_contacto.findUnique({
        where: {
          remitente_id_destinatario_id: {
            remitente_id: remitente,
            destinatario_id: destinatario,
          },
        },
      });

    if (solicitudExistente?.estado === 'aceptada') {
      throw new ConflictException('Ya son contactos');
    }

    if (solicitudExistente?.estado === 'pendiente') {
      throw new ConflictException(
        'Ya has enviado una solicitud a este usuario',
      );
    }

    // Verificar si el otro usuario ya envió una solicitud
    const solicitudInversa =
      await this.prisma.solicitudes_contacto.findUnique({
        where: {
          remitente_id_destinatario_id: {
            remitente_id: destinatario,
            destinatario_id: remitente,
          },
        },
      });

    if (solicitudInversa?.estado === 'aceptada') {
      throw new ConflictException('Ya son contactos');
    }

    if (solicitudInversa?.estado === 'pendiente') {
      throw new ConflictException(
        'Este usuario ya te envió una solicitud. Puedes aceptarla desde tus solicitudes recibidas',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const solicitud = solicitudExistente
        ? await tx.solicitudes_contacto.update({
            where: { id: solicitudExistente.id },
            data: {
              estado: 'pendiente',
              respondido_en: null,
              creado_en: new Date(),
            },
          })
        : await tx.solicitudes_contacto.create({
            data: {
              remitente_id: remitente,
              destinatario_id: destinatario,
              estado: 'pendiente',
            },
          });

      await tx.notificaciones.create({
        data: {
          usuario_id: destinatario,
          tipo: 'solicitud_contacto',
          titulo: 'Nueva solicitud de contacto',
          contenido: 'Tienes una nueva solicitud de contacto',
          referencia_id: solicitud.id,
        },
      });

      return solicitud;
    });

    return {
      mensaje: 'Solicitud de contacto enviada correctamente',
      solicitud: {
        id: resultado.id.toString(),
        destinatario: {
          id: usuarioDestino.id.toString(),
          nombre_completo: usuarioDestino.nombre_completo,
          nombre_usuario: usuarioDestino.nombre_usuario,
        },
        estado: resultado.estado,
        creado_en: resultado.creado_en,
      },
    };
  }

  // ==========================================
  // SOLICITUDES RECIBIDAS
  // ==========================================
  async solicitudesRecibidas(usuarioId: string) {
    const solicitudes =
      await this.prisma.solicitudes_contacto.findMany({
        where: {
          destinatario_id: BigInt(usuarioId),
          estado: 'pendiente',
        },
        include: {
          usuarios_solicitudes_contacto_remitente_idTousuarios: {
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

    return solicitudes.map((solicitud) => {
      const remitente =
        solicitud.usuarios_solicitudes_contacto_remitente_idTousuarios;

      return {
        id: solicitud.id.toString(),
        estado: solicitud.estado,
        creado_en: solicitud.creado_en,
        usuario: {
          id: remitente.id.toString(),
          nombre_completo: remitente.nombre_completo,
          nombre_usuario: remitente.nombre_usuario,
          foto_perfil: remitente.foto_perfil,
          biografia: remitente.biografia,
        },
      };
    });
  }

  // ==========================================
  // SOLICITUDES ENVIADAS
  // ==========================================
  async solicitudesEnviadas(usuarioId: string) {
    const solicitudes =
      await this.prisma.solicitudes_contacto.findMany({
        where: {
          remitente_id: BigInt(usuarioId),
          estado: 'pendiente',
        },
        include: {
          usuarios_solicitudes_contacto_destinatario_idTousuarios: {
            select: {
              id: true,
              nombre_completo: true,
              nombre_usuario: true,
              foto_perfil: true,
            },
          },
        },
        orderBy: {
          creado_en: 'desc',
        },
      });

    return solicitudes.map((solicitud) => {
      const destinatario =
        solicitud.usuarios_solicitudes_contacto_destinatario_idTousuarios;

      return {
        id: solicitud.id.toString(),
        estado: solicitud.estado,
        creado_en: solicitud.creado_en,
        usuario: {
          id: destinatario.id.toString(),
          nombre_completo: destinatario.nombre_completo,
          nombre_usuario: destinatario.nombre_usuario,
          foto_perfil: destinatario.foto_perfil,
        },
      };
    });
  }

  // ==========================================
  // ACEPTAR SOLICITUD
  // ==========================================
  async aceptarSolicitud(
    usuarioId: string,
    solicitudId: string,
  ) {
    const id = BigInt(solicitudId);
    const usuario = BigInt(usuarioId);

    const solicitud =
      await this.prisma.solicitudes_contacto.findUnique({
        where: { id },
      });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.destinatario_id !== usuario) {
      throw new ForbiddenException(
        'No tienes permiso para aceptar esta solicitud',
      );
    }

    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException(
        'Esta solicitud ya fue respondida',
      );
    }

    const bloqueo = await this.prisma.bloqueos.findFirst({
      where: {
        OR: [
          {
            usuario_id: usuario,
            bloqueado_id: solicitud.remitente_id,
          },
          {
            usuario_id: solicitud.remitente_id,
            bloqueado_id: usuario,
          },
        ],
      },
    });

    if (bloqueo) {
      throw new ForbiddenException(
        'No puedes aceptar la solicitud porque existe un bloqueo',
      );
    }

    const actualizada = await this.prisma.$transaction(async (tx) => {
      const resultado = await tx.solicitudes_contacto.update({
        where: { id },
        data: {
          estado: 'aceptada',
          respondido_en: new Date(),
        },
      });

      await tx.notificaciones.create({
        data: {
          usuario_id: solicitud.remitente_id,
          tipo: 'solicitud_contacto',
          titulo: 'Solicitud de contacto aceptada',
          contenido: 'Tu solicitud de contacto fue aceptada',
          referencia_id: solicitud.id,
        },
      });

      return resultado;
    });

    return {
      mensaje: 'Solicitud aceptada correctamente',
      solicitud: {
        id: actualizada.id.toString(),
        estado: actualizada.estado,
        respondido_en: actualizada.respondido_en,
      },
    };
  }

  // ==========================================
  // RECHAZAR SOLICITUD
  // ==========================================
  async rechazarSolicitud(
    usuarioId: string,
    solicitudId: string,
  ) {
    const id = BigInt(solicitudId);
    const usuario = BigInt(usuarioId);

    const solicitud =
      await this.prisma.solicitudes_contacto.findUnique({
        where: { id },
      });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.destinatario_id !== usuario) {
      throw new ForbiddenException(
        'No tienes permiso para rechazar esta solicitud',
      );
    }

    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException(
        'Esta solicitud ya fue respondida',
      );
    }

    const actualizada =
      await this.prisma.solicitudes_contacto.update({
        where: { id },
        data: {
          estado: 'rechazada',
          respondido_en: new Date(),
        },
      });

    return {
      mensaje: 'Solicitud rechazada correctamente',
      solicitud: {
        id: actualizada.id.toString(),
        estado: actualizada.estado,
        respondido_en: actualizada.respondido_en,
      },
    };
  }

  // ==========================================
  // LISTAR CONTACTOS ACEPTADOS
  // ==========================================
  async listarContactos(usuarioId: string) {
    const id = BigInt(usuarioId);

    const solicitudes =
      await this.prisma.solicitudes_contacto.findMany({
        where: {
          estado: 'aceptada',
          OR: [
            { remitente_id: id },
            { destinatario_id: id },
          ],
        },
        include: {
          usuarios_solicitudes_contacto_remitente_idTousuarios: {
            select: {
              id: true,
              nombre_completo: true,
              nombre_usuario: true,
              foto_perfil: true,
              biografia: true,
            },
          },
          usuarios_solicitudes_contacto_destinatario_idTousuarios: {
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
          respondido_en: 'desc',
        },
      });

    return solicitudes.map((solicitud) => {
      const contacto =
        solicitud.remitente_id === id
          ? solicitud.usuarios_solicitudes_contacto_destinatario_idTousuarios
          : solicitud.usuarios_solicitudes_contacto_remitente_idTousuarios;

      return {
        id: contacto.id.toString(),
        nombre_completo: contacto.nombre_completo,
        nombre_usuario: contacto.nombre_usuario,
        foto_perfil: contacto.foto_perfil,
        biografia: contacto.biografia,
        agregado_en: solicitud.respondido_en,
      };
    });
  }

  // ==========================================
  // ELIMINAR CONTACTO
  // ==========================================
  async eliminarContacto(
    usuarioId: string,
    contactoId: string,
  ) {
    const usuario = BigInt(usuarioId);
    const contacto = BigInt(contactoId);

    if (usuario === contacto) {
      throw new BadRequestException(
        'No puedes eliminarte a ti mismo',
      );
    }

    const solicitudes =
      await this.prisma.solicitudes_contacto.findMany({
        where: {
          estado: 'aceptada',
          OR: [
            {
              remitente_id: usuario,
              destinatario_id: contacto,
            },
            {
              remitente_id: contacto,
              destinatario_id: usuario,
            },
          ],
        },
      });

    if (solicitudes.length === 0) {
      throw new NotFoundException('El contacto no existe');
    }

    await this.prisma.solicitudes_contacto.deleteMany({
      where: {
        estado: 'aceptada',
        OR: [
          {
            remitente_id: usuario,
            destinatario_id: contacto,
          },
          {
            remitente_id: contacto,
            destinatario_id: usuario,
          },
        ],
      },
    });

    return {
      mensaje: 'Contacto eliminado correctamente',
    };
  }
}