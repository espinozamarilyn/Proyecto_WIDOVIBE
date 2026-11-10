
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class ConfigurarPermisosDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['propietario', 'administrador', 'miembro'])
  rol!: string;

  @IsBoolean()
  puedeVer!: boolean;

  @IsBoolean()
  puedeEscribir!: boolean;

  @IsBoolean()
  puedeAdjuntar!: boolean;

  @IsBoolean()
  puedeAdministrar!: boolean;
}
