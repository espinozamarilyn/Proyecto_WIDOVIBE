import {
  Controller,
  Get,
  Patch,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UsuariosService } from './usuarios.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('perfil')
  obtenerPerfil(@Req() req: any) {
    return this.usuariosService.obtenerPerfil(req.user.id);
  }

  @Patch('perfil')
  actualizarPerfil(
    @Req() req: any,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(
      req.user.id,
      dto,
    );
  }

  @Get('buscar')
  buscarUsuarios(
    @Req() req: any,
    @Query('busqueda') busqueda: string,
  ) {
    return this.usuariosService.buscarUsuarios(
      busqueda,
      req.user.id,
    );
  }
}