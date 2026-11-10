import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversacionesService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    return BigInt(id);
  }

  // ==========================================
  // VERIFICAR QUE DOS USUARIOS SEAN CONTACTOS
  // ==========================================
  private async sonContactos(
    usuarioId: bigint,
    contactoId: bigint,
  ): Promise<boolean> {
    const solicitud = await this.prisma.solicitudes_contacto.findFirst({
      where: {
        estado: 'aceptada',
        OR: [
          {
            remitente_id: usuarioId,
            destinatario_id: contactoId,
          },
          {
            remitente_id: contactoId,
            destinatario_id: usuarioId,
          },
        ],
      },
    });

    return Boolean(solicitud);
  }

  // ==========================================
  // VERIFICAR BLOQUEOS
  // ==========================================
  private async existeBloqueo(
    usuarioId: bigint,
    contactoId: bigint,
  ): Promise<boolean> {
    const bloqueo = await this.prisma.bloqueos.findFirst({
      where: {
        OR: [
          {
            usuario_id: usuarioId,
            bloqueado_id: contactoId,
          },
          {
            usuario_id: contactoId,
            bloqueado_id: usuarioId,
          },
        ],
      },
    });

    return Boolean(bloqueo);
  }

  // ==========================================
  // CREAR CONVERSACIÓN INDIVIDUAL
  // ==========================================
  async crearIndividual(
    usuarioId: string,
    contactoId: string,
  ) {
    const usuario = this.convertirId(usuarioId);
    const contacto = this.convertirId(contactoId);

    if (usuario === contacto) {
      throw new BadRequestException(
        'No puedes crear una conversación contigo mismo',
      );
    }

    const usuarioContacto = await this.prisma.usuarios.findUnique({
      where: { id: contacto },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        estado: true,
      },
    });

    if (!usuarioContacto || usuarioContacto.estado !== 'activo') {
      throw new NotFoundException('Contacto no encontrado');
    }

    if (!(await this.sonContactos(usuario, contacto))) {
      throw new ForbiddenException(
        'Solo puedes iniciar conversaciones con contactos aceptados',
      );
    }

    if (await this.existeBloqueo(usuario, contacto)) {
      throw new ForbiddenException(
        'No puedes conversar con este usuario',
      );
    }

    // Buscar una conversación individual existente.
    const conversacionesExistentes =
      await this.prisma.conversaciones.findMany({
        where: {
          tipo: 'individual',
          participantes_conversacion: {
            some: {
              usuario_id: usuario,
              retirado_en: null,
            },
          },
          AND: [
            {
              participantes_conversacion: {
                some: {
                  usuario_id: contacto,
                  retirado_en: null,
                },
              },
            },
          ],
        },
        include: {
          participantes_conversacion: {
            where: {
              retirado_en: null,
            },
          },
        },
      });

    const existente = conversacionesExistentes.find(
      (conversacion) =>
        conversacion.participantes_conversacion.length === 2,
    );

    if (existente) {
      return {
        mensaje: 'La conversación ya existe',
        conversacion: {
          id: existente.id.toString(),
          tipo: existente.tipo,
          creado_en: existente.creado_en,
        },
      };
    }

    const conversacion = await this.prisma.conversaciones.create({
      data: {
        tipo: 'individual',
        creado_por: usuario,
        participantes_conversacion: {
          create: [
            {
              usuario_id: usuario,
              rol: 'propietario',
            },
            {
              usuario_id: contacto,
              rol: 'miembro',
            },
          ],
        },
      },
    });

    return {
      mensaje: 'Conversación individual creada correctamente',
      conversacion: {
        id: conversacion.id.toString(),
        tipo: conversacion.tipo,
        creado_en: conversacion.creado_en,
        contacto: {
          id: usuarioContacto.id.toString(),
          nombre_completo: usuarioContacto.nombre_completo,
          nombre_usuario: usuarioContacto.nombre_usuario,
        },
      },
    };
  }

  // ==========================================
  // CREAR CONVERSACIÓN GRUPAL
  // ==========================================
  async crearGrupal(
    usuarioId: string,
    datos: {
      nombre: string;
      descripcion?: string;
      participantesIds?: string[];
    },
  ) {
    const creador = this.convertirId(usuarioId);

    const idsParticipantes = (datos.participantesIds ?? []).map(
      (id) => this.convertirId(id),
    );

    if (idsParticipantes.includes(creador)) {
      throw new BadRequestException(
        'No incluyas tu propio ID en la lista de participantes',
      );
    }

    const idsUnicos = [...new Set(idsParticipantes.map(String))];

    if (idsUnicos.length !== idsParticipantes.length) {
      throw new BadRequestException(
        'No puedes agregar participantes duplicados',
      );
    }

    const participantes = await this.prisma.usuarios.findMany({
      where: {
        id: {
          in: idsParticipantes,
        },
        estado: 'activo',
      },
      select: {
        id: true,
      },
    });

    if (participantes.length !== idsParticipantes.length) {
      throw new NotFoundException(
        'Uno o más participantes no existen o no están activos',
      );
    }

    for (const participanteId of idsParticipantes) {
      if (!(await this.sonContactos(creador, participanteId))) {
        throw new ForbiddenException(
          'Solo puedes agregar a tus contactos aceptados al grupo',
        );
      }

      if (await this.existeBloqueo(creador, participanteId)) {
        throw new ForbiddenException(
          'No puedes agregar a un usuario bloqueado',
        );
      }
    }

    const conversacion = await this.prisma.conversaciones.create({
      data: {
        tipo: 'grupal',
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion?.trim() || null,
        creado_por: creador,
        participantes_conversacion: {
          create: [
            {
              usuario_id: creador,
              rol: 'propietario',
              puede_enviar_mensajes: true,
              puede_adjuntar_archivos: true,
              puede_invitar: true,
            },
            ...idsParticipantes.map((id) => ({
              usuario_id: id,
              rol: 'miembro' as const,
              puede_enviar_mensajes: true,
              puede_adjuntar_archivos: true,
              puede_invitar: false,
            })),
          ],
        },
      },
      include: {
        participantes_conversacion: {
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
        },
      },
    });

    return {
      mensaje: 'Grupo creado correctamente',
      conversacion: {
        id: conversacion.id.toString(),
        tipo: conversacion.tipo,
        nombre: conversacion.nombre,
        descripcion: conversacion.descripcion,
        creado_en: conversacion.creado_en,
        participantes: conversacion.participantes_conversacion.map(
          (participante) => ({
            id: participante.usuarios.id.toString(),
            nombre_completo: participante.usuarios.nombre_completo,
            nombre_usuario: participante.usuarios.nombre_usuario,
            foto_perfil: participante.usuarios.foto_perfil,
            rol: participante.rol,
          }),
        ),
      },
    };
  }

  // ==========================================
  // LISTAR CONVERSACIONES DEL USUARIO
  // ==========================================
  async listar(usuarioId: string) {
    const usuario = this.convertirId(usuarioId);

    const conversaciones = await this.prisma.conversaciones.findMany({
      where: {
        participantes_conversacion: {
          some: {
            usuario_id: usuario,
            retirado_en: null,
          },
        },
      },
      include: {
        participantes_conversacion: {
          where: {
            retirado_en: null,
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
        },
        mensajes: {
          where: {
            eliminado_en: null,
          },
          orderBy: {
            creado_en: 'desc',
          },
          take: 1,
          select: {
            id: true,
            remitente_id: true,
            contenido: true,
            tipo: true,
            creado_en: true,
          },
        },
      },
      orderBy: {
        actualizado_en: 'desc',
      },
    });

    return conversaciones.map((conversacion) => ({
      id: conversacion.id.toString(),
      tipo: conversacion.tipo,
      nombre: conversacion.nombre,
      descripcion: conversacion.descripcion,
      foto: conversacion.foto,
      creado_en: conversacion.creado_en,
      participantes: conversacion.participantes_conversacion.map(
        (participante) => ({
          id: participante.usuarios.id.toString(),
          nombre_completo: participante.usuarios.nombre_completo,
          nombre_usuario: participante.usuarios.nombre_usuario,
          foto_perfil: participante.usuarios.foto_perfil,
          rol: participante.rol,
        }),
      ),
      ultimo_mensaje: conversacion.mensajes[0]
        ? {
            id: conversacion.mensajes[0].id.toString(),
            remitente_id:
              conversacion.mensajes[0].remitente_id.toString(),
            contenido: conversacion.mensajes[0].contenido,
            tipo: conversacion.mensajes[0].tipo,
            creado_en: conversacion.mensajes[0].creado_en,
          }
        : null,
    }));
  }

  // ==========================================
  // CONSULTAR DETALLE DE CONVERSACIÓN
  // ==========================================
  async obtenerPorId(
    usuarioId: string,
    conversacionId: string,
  ) {
    const usuario = this.convertirId(usuarioId);
    const id = this.convertirId(conversacionId);

    const conversacion = await this.prisma.conversaciones.findFirst({
      where: {
        id,
        participantes_conversacion: {
          some: {
            usuario_id: usuario,
            retirado_en: null,
          },
        },
      },
      include: {
        participantes_conversacion: {
          where: {
            retirado_en: null,
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
        },
      },
    });

    if (!conversacion) {
      throw new NotFoundException(
        'Conversación no encontrada o no tienes acceso',
      );
    }

    return {
      id: conversacion.id.toString(),
      tipo: conversacion.tipo,
      nombre: conversacion.nombre,
      descripcion: conversacion.descripcion,
      foto: conversacion.foto,
      creado_en: conversacion.creado_en,
      actualizado_en: conversacion.actualizado_en,
      participantes: conversacion.participantes_conversacion.map(
        (participante) => ({
          id: participante.usuarios.id.toString(),
          nombre_completo: participante.usuarios.nombre_completo,
          nombre_usuario: participante.usuarios.nombre_usuario,
          foto_perfil: participante.usuarios.foto_perfil,
          rol: participante.rol,
          unido_en: participante.unido_en,
        }),
      ),
    };
  }
}