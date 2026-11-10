import { Module } from '@nestjs/common';

import { MensajesController } from './mensajes.controller';
import { MensajesService } from './mensajes.service';
import { CanalesModule } from '../canales/canales.module';

@Module({
  imports: [CanalesModule],
  controllers: [MensajesController],
  providers: [MensajesService],
  exports: [MensajesService],
})
export class MensajesModule {}