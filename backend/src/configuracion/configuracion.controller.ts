import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import { ConfiguracionService } from './configuracion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class ActualizarConfiguracionDto {
  @IsOptional()
  @IsIn(['publico', 'contactos', 'privado'])
  privacidad_perfil?: 'publico' | 'contactos' | 'privado';

  @IsOptional()
  @IsIn(['todos', 'contactos', 'nadie'])
  quien_puede_contactar?: 'todos' | 'contactos' | 'nadie';

  @IsOptional()
  @IsBoolean()
  mostrar_estado_conexion?: boolean;

  @IsOptional()
  @IsBoolean()
  notificaciones_activadas?: boolean;
}

@Controller('configuracion')
@UseGuards(JwtAuthGuard)
export class ConfiguracionController {
  constructor(
    private readonly configuracionService: ConfiguracionService,
  ) {}

  @Get()
  obtener(@Req() req: any) {
    return this.configuracionService.obtener(req.user.id);
  }

  @Patch()
  actualizar(
    @Req() req: any,
    @Body() dto: ActualizarConfiguracionDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debes proporcionar al menos una configuración',
      );
    }

    return this.configuracionService.actualizar(
      req.user.id,
      dto,
    );
  }
}