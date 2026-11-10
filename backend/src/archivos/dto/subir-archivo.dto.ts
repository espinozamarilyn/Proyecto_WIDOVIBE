import { IsString, Matches } from 'class-validator';

export class SubirArchivoDto {
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'El ID del mensaje debe ser un número válido',
  })
  mensajeId: string;
}