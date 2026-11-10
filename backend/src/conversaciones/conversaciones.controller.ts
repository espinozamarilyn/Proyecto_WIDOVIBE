import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { ConversacionesService } from './conversaciones.service';

import { CrearConversacionIndividualDto } from './dto/crear-conversacion-individual.dto';
import { CrearConversacionGrupalDto } from './dto/crear-conversacion-grupal.dto';

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
@Controller('conversaciones')
export class ConversacionesController {
  constructor(
    private readonly conversacionesService: ConversacionesService,
  ) {}

  // Crear conversación individual
  @Post('individual')
  crearIndividual(
    @Req() req: RequestAutenticado,
    @Body() datos: CrearConversacionIndividualDto,
  ) {
    return this.conversacionesService.crearIndividual(
      req.user.id,
      datos.contactoId,
    );
  }

  // Crear conversación grupal
  @Post('grupal')
  crearGrupal(
    @Req() req: RequestAutenticado,
    @Body() datos: CrearConversacionGrupalDto,
  ) {
    return this.conversacionesService.crearGrupal(
      req.user.id,
      datos,
    );
  }

  // Listar conversaciones
  @Get()
  listar(@Req() req: RequestAutenticado) {
    return this.conversacionesService.listar(req.user.id);
  }

  // Consultar una conversación
  @Get(':id')
  obtenerPorId(
    @Req() req: RequestAutenticado,
    @Param('id') id: string,
  ) {
    return this.conversacionesService.obtenerPorId(
      req.user.id,
      id,
    );
  }
}