import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CrearConversacionIndividualDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'El ID del contacto debe ser válido',
  })
  contactoId: string;
}