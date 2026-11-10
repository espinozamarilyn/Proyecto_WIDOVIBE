import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class EnviarMensajeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  contenido!: string;

  @IsOptional()
  @IsUUID()
  claveIdempotencia?: string;
}