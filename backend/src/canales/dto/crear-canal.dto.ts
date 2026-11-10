
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearCanalDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['texto', 'anuncios'])
  tipo!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
