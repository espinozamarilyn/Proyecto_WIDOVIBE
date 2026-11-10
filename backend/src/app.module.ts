import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

import { ContactosModule } from './contactos/contactos.module';

import { BloqueosModule } from './bloqueos/bloqueos.module';

import { ConversacionesModule } from './conversaciones/conversaciones.module';

import { ComunidadesModule } from './comunidades/comunidades.module';

import { CanalesModule } from './canales/canales.module';

import { NotificacionesModule } from './notificaciones/notificaciones.module';

import { ReportesModule } from './reportes/reportes.module';

import { UsuariosModule } from './usuarios/usuarios.module';

import { ConfiguracionModule } from './configuracion/configuracion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ContactosModule,
    BloqueosModule,
    ConversacionesModule,
    ComunidadesModule,
    CanalesModule,
    NotificacionesModule,
    ReportesModule,
    UsuariosModule,
    ConfiguracionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}