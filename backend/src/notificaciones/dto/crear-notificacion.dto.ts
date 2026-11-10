import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { notificaciones_tipo } from '@prisma/client';

export class CrearNotificacionDto {
  @IsEnum(notificaciones_tipo)
  tipo: notificaciones_tipo;

  @IsString()
  @MaxLength(120)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contenido?: string;

  @IsOptional()
  @IsString()
  referenciaId?: string;
}