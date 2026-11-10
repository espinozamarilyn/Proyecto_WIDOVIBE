import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { reportes_motivo } from '@prisma/client';

export class CrearReporteDto {
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  usuarioReportadoId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  mensajeReportadoId?: string;

  @IsEnum(reportes_motivo)
  motivo: reportes_motivo;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;
}