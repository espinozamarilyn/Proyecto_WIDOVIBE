import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { MensajesService } from './mensajes.service';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
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

@Controller('mensajes')
@UseGuards(JwtAuthGuard)
export class MensajesController {
  constructor(
    private readonly mensajesService: MensajesService,
  ) {}

  @Post('conversacion/:conversacionId')
  enviarMensaje(
    @Req() req: RequestConUsuario,
    @Param('conversacionId') conversacionId: string,
    @Body() datos: EnviarMensajeDto,
  ) {
    return this.mensajesService.enviarMensaje(
      req.user.id,
      conversacionId,
      datos,
    );
  }

  @Get('conversacion/:conversacionId')
  listarMensajes(
    @Req() req: RequestConUsuario,
    @Param('conversacionId') conversacionId: string,
    @Query('limite') limite?: string,
  ) {
    return this.mensajesService.listarMensajes(
      req.user.id,
      conversacionId,
      limite,
    );
  }

  @Post('canal/:canalId')
  enviarMensajeCanal(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
    @Body() datos: EnviarMensajeDto,
  ) {
    return this.mensajesService.enviarMensajeCanal(
      req.user.id,
      canalId,
      datos,
    );
  }

  @Get('canal/:canalId')
  listarMensajesCanal(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
    @Query('limite') limite?: string,
  ) {
    return this.mensajesService.listarMensajesCanal(
      req.user.id,
      canalId,
      limite,
    );
  }

  @Patch('conversacion/:conversacionId/:mensajeId/entregado')
  marcarEntregado(
    @Req() req: RequestConUsuario,
    @Param('conversacionId') conversacionId: string,
    @Param('mensajeId') mensajeId: string,
  ) {
    return this.mensajesService.marcarEntregado(
      req.user.id,
      conversacionId,
      mensajeId,
    );
  }

  @Patch('conversacion/:conversacionId/:mensajeId/leido')
  marcarLeido(
    @Req() req: RequestConUsuario,
    @Param('conversacionId') conversacionId: string,
    @Param('mensajeId') mensajeId: string,
  ) {
    return this.mensajesService.marcarLeido(
      req.user.id,
      conversacionId,
      mensajeId,
    );
  }
}
