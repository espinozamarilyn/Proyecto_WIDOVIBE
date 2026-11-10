import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class EnviarSolicitudDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'El ID del destinatario debe ser un número válido',
  })
  destinatarioId: string;
}