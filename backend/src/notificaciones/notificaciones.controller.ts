
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { NotificacionesService } from './notificaciones.service';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestConUsuario extends Request {
  user: {
    id: string;
    correo: string;
    nombre_usuario: string;
    nombre_completo: string;
    rol: string;
  };
}

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Post()
  crear(
    @Req() req: RequestConUsuario,
    @Body() datos: CrearNotificacionDto,
  ) {
    return this.notificacionesService.crear(
      req.user.id,
      datos,
    );
  }

  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.notificacionesService.listar(
      req.user.id,
    );
  }

  @Get('no-leidas/contador')
  contarNoLeidas(@Req() req: RequestConUsuario) {
    return this.notificacionesService.contarNoLeidas(
      req.user.id,
    );
  }

  @Patch('marcar-todas-leidas')
  marcarTodasLeidas(@Req() req: RequestConUsuario) {
    return this.notificacionesService.marcarTodasLeidas(
      req.user.id,
    );
  }

  @Patch(':id/leida')
  marcarLeida(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
  ) {
    return this.notificacionesService.marcarLeida(
      req.user.id,
      id,
    );
  }

  @Delete(':id')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
  ) {
    return this.notificacionesService.eliminar(
      req.user.id,
      id,
    );
  }
}
