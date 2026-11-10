import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearConversacionGrupalDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[1-9]\d*$/, {
    each: true,
    message: 'Todos los IDs de participantes deben ser válidos',
  })
  participantesIds?: string[];
}