
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
import { ComunidadesService } from './comunidades.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';
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

@Controller('comunidades')
export class ComunidadesController {
  constructor(
    private readonly comunidadesService: ComunidadesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  crear(
    @Req() req: RequestConUsuario,
    @Body() datos: CrearComunidadDto,
  ) {
    return this.comunidadesService.crear(
      req.user.id,
      datos,
    );
  }

  @Get('publicas')
  listarPublicas() {
    return this.comunidadesService.listarPublicas();
  }

  @Get(':id')
  obtenerPorId(
    @Param('id') id: string,
  ) {
    return this.comunidadesService.obtenerPorId(id);
  }

  @Post(':id/unirse')
  @UseGuards(JwtAuthGuard)
  unirse(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
  ) {
    return this.comunidadesService.unirsePublica(
      req.user.id,
      id,
    );
  }

  @Post(':id/solicitar-ingreso')
  @UseGuards(JwtAuthGuard)
  solicitarIngreso(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
  ) {
    return this.comunidadesService.solicitarIngreso(
      req.user.id,
      id,
    );
  }

  @Get(':id/solicitudes')
  @UseGuards(JwtAuthGuard)
  listarSolicitudes(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
  ) {
    return this.comunidadesService.listarSolicitudes(
      req.user.id,
      id,
    );
  }

  @Patch(':id/solicitudes/:usuarioId/aceptar')
  @UseGuards(JwtAuthGuard)
  aceptarSolicitud(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.comunidadesService.responderSolicitud(
      req.user.id,
      id,
      usuarioId,
      true,
    );
  }

  @Patch(':id/solicitudes/:usuarioId/rechazar')
  @UseGuards(JwtAuthGuard)
  rechazarSolicitud(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.comunidadesService.responderSolicitud(
      req.user.id,
      id,
      usuarioId,
      false,
    );
  }

  @Get(':id/miembros')
  @UseGuards(JwtAuthGuard)
  listarMiembros(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
  ) {
    return this.comunidadesService.listarMiembros(
      req.user.id,
      id,
    );
  }

  @Delete(':id/miembros/:usuarioId')
  @UseGuards(JwtAuthGuard)
  expulsarMiembro(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.comunidadesService.expulsarMiembro(
      req.user.id,
      id,
      usuarioId,
    );
  }
}
