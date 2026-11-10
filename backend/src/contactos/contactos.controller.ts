import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { ContactosService } from './contactos.service';
import { EnviarSolicitudDto } from './dto/enviar-solicitud.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestAutenticado extends Request {
  user: {
    id: string;
    correo: string;
    nombre_usuario: string;
    nombre_completo: string;
    rol: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('contactos')
export class ContactosController {
  constructor(
    private readonly contactosService: ContactosService,
  ) {}

  // Enviar solicitud
  @Post('solicitudes')
  enviarSolicitud(
    @Req() req: RequestAutenticado,
    @Body() datos: EnviarSolicitudDto,
  ) {
    return this.contactosService.enviarSolicitud(
      req.user.id,
      datos.destinatarioId,
    );
  }

  // Solicitudes recibidas
  @Get('solicitudes/recibidas')
  solicitudesRecibidas(@Req() req: RequestAutenticado) {
    return this.contactosService.solicitudesRecibidas(
      req.user.id,
    );
  }

  // Solicitudes enviadas
  @Get('solicitudes/enviadas')
  solicitudesEnviadas(@Req() req: RequestAutenticado) {
    return this.contactosService.solicitudesEnviadas(
      req.user.id,
    );
  }

  // Aceptar solicitud
  @Patch('solicitudes/:solicitudId/aceptar')
  aceptarSolicitud(
    @Req() req: RequestAutenticado,
    @Param('solicitudId') solicitudId: string,
  ) {
    return this.contactosService.aceptarSolicitud(
      req.user.id,
      solicitudId,
    );
  }

  // Rechazar solicitud
  @Patch('solicitudes/:solicitudId/rechazar')
  rechazarSolicitud(
    @Req() req: RequestAutenticado,
    @Param('solicitudId') solicitudId: string,
  ) {
    return this.contactosService.rechazarSolicitud(
      req.user.id,
      solicitudId,
    );
  }

  // Listar contactos
  @Get()
  listarContactos(@Req() req: RequestAutenticado) {
    return this.contactosService.listarContactos(
      req.user.id,
    );
  }

  // Eliminar contacto
  @Delete(':contactoId')
  eliminarContacto(
    @Req() req: RequestAutenticado,
    @Param('contactoId') contactoId: string,
  ) {
    return this.contactosService.eliminarContacto(
      req.user.id,
      contactoId,
    );
  }
}