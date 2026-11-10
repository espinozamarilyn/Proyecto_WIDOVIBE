import { Module } from '@nestjs/common';

import { ArchivosController } from './archivos.controller';
import { ArchivosService } from './archivos.service';
import { CanalesModule } from '../canales/canales.module';

@Module({
  imports: [CanalesModule],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class ArchivosModule {}