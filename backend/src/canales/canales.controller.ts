
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { CanalesService } from './canales.service';
import { CrearCanalDto } from './dto/crear-canal.dto';
import { ActualizarCanalDto } from './dto/actualizar-canal.dto';
import { ConfigurarPermisosDto } from './dto/configurar-permisos.dto';
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

@Controller('canales')
@UseGuards(JwtAuthGuard)
export class CanalesController {
  constructor(
    private readonly canalesService: CanalesService,
  ) {}

  @Post('comunidad/:comunidadId')
  crear(
    @Req() req: RequestConUsuario,
    @Param('comunidadId') comunidadId: string,
    @Body() datos: CrearCanalDto,
  ) {
    return this.canalesService.crear(
      req.user.id,
      comunidadId,
      datos,
    );
  }

  @Get('comunidad/:comunidadId')
  listar(
    @Req() req: RequestConUsuario,
    @Param('comunidadId') comunidadId: string,
  ) {
    return this.canalesService.listar(
      req.user.id,
      comunidadId,
    );
  }

  @Get(':canalId')
  obtenerPorId(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
  ) {
    return this.canalesService.obtenerPorId(
      req.user.id,
      canalId,
    );
  }

  @Patch(':canalId')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
    @Body() datos: ActualizarCanalDto,
  ) {
    return this.canalesService.actualizar(
      req.user.id,
      canalId,
      datos,
    );
  }

  @Delete(':canalId')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
  ) {
    return this.canalesService.eliminar(
      req.user.id,
      canalId,
    );
  }

  @Put('permisos/:canalId')
  configurarPermisos(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
    @Body() datos: ConfigurarPermisosDto,
  ) {
    return this.canalesService.configurarPermisos(
      req.user.id,
      canalId,
      datos,
    );
  }

  @Get('permisos/:canalId')
  obtenerPermisos(
    @Req() req: RequestConUsuario,
    @Param('canalId') canalId: string,
  ) {
    return this.canalesService.obtenerPermisos(
      req.user.id,
      canalId,
    );
  }
}
