import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { reportes_estado } from '@prisma/client';

export class ActualizarReporteDto {
  @IsEnum(reportes_estado)
  estado: reportes_estado;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolucion?: string;
}