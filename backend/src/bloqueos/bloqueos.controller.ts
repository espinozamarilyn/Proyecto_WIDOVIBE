import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { BloqueosService } from './bloqueos.service';
import { BloquearUsuarioDto } from './dto/bloquear-usuario.dto';
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
@Controller('bloqueos')
export class BloqueosController {
  constructor(
    private readonly bloqueosService: BloqueosService,
  ) {}

  // Bloquear usuario
  @Post()
  bloquearUsuario(
    @Req() req: RequestAutenticado,
    @Body() datos: BloquearUsuarioDto,
  ) {
    return this.bloqueosService.bloquearUsuario(
      req.user.id,
      datos.usuarioId,
    );
  }

  // Listar usuarios bloqueados
  @Get()
  listarBloqueados(@Req() req: RequestAutenticado) {
    return this.bloqueosService.listarBloqueados(
      req.user.id,
    );
  }

  // Desbloquear usuario
  @Delete(':usuarioId')
  desbloquearUsuario(
    @Req() req: RequestAutenticado,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.bloqueosService.desbloquearUsuario(
      req.user.id,
      usuarioId,
    );
  }
}