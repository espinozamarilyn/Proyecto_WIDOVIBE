import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  nombre_completo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'El nombre de usuario solo admite letras, números, puntos y guiones bajos',
  })
  nombre_usuario!: string;

  @IsEmail()
  @MaxLength(150)
  correo!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}