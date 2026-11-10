import { Module } from '@nestjs/common';

import { ConversacionesController } from './conversaciones.controller';
import { ConversacionesService } from './conversaciones.service';

@Module({
  controllers: [ConversacionesController],
  providers: [ConversacionesService],
  exports: [ConversacionesService],
})
export class ConversacionesModule {}