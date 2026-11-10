
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SolicitarIngresoDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'El ID de la comunidad debe ser válido',
  })
  comunidadId!: string;
}
