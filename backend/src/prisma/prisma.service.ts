import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
    console.log('Conexión con MariaDB establecida correctamente');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}