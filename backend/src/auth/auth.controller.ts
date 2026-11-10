import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface RequestAutenticado extends Request {
  user: {
    id: string;
    correo: string;
    nombre_usuario: string;
    nombre_completo: string;
    rol: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  registrar(@Body() datos: RegistroDto) {
    return this.authService.registrar(datos);
  }

  @Post('login')
  login(@Body() datos: LoginDto) {
    return this.authService.login(datos);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  obtenerPerfil(@Req() req: RequestAutenticado) {
    return this.authService.obtenerPerfil(req.user.id);
  }
}