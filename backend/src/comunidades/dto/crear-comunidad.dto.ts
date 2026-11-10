
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';

export class CrearComunidadDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['publica', 'privada'])
  privacidad!: string;
}
