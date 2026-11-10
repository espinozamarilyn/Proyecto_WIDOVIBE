import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BuscarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  busqueda?: string;
}