import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  nombre_usuario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  foto_perfil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  biografia?: string;
}