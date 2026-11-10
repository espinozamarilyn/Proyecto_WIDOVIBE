import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BloquearUsuarioDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'El ID del usuario debe ser válido',
  })
  usuarioId: string;
}