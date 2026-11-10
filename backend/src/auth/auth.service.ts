import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // REGISTRO
  async registrar(datos: RegistroDto) {
    const usuarioExistente = await this.prisma.usuarios.findFirst({
      where: {
        OR: [
          { correo: datos.correo },
          { nombre_usuario: datos.nombre_usuario },
        ],
      },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'El correo o nombre de usuario ya está registrado',
      );
    }

    const passwordHash = await bcrypt.hash(datos.password, 12);

    const usuario = await this.prisma.usuarios.create({
      data: {
        nombre_completo: datos.nombre_completo,
        nombre_usuario: datos.nombre_usuario,
        correo: datos.correo,
        password_hash: passwordHash,
      },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        correo: true,
        rol: true,
      },
    });

    const token = await this.generarToken(usuario);

    return {
      mensaje: 'Usuario registrado correctamente',
      access_token: token,
      usuario: {
        id: usuario.id.toString(),
        nombre_completo: usuario.nombre_completo,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }

  // LOGIN
  async login(datos: LoginDto) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: {
        correo: datos.correo,
      },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        correo: true,
        password_hash: true,
        estado: true,
        rol: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordCorrecta = await bcrypt.compare(
      datos.password,
      usuario.password_hash,
    );

    if (!passwordCorrecta) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (usuario.estado !== 'activo') {
      throw new UnauthorizedException(
        'Tu cuenta no se encuentra activa',
      );
    }

    const token = await this.generarToken(usuario);

    return {
      mensaje: 'Inicio de sesión exitoso',
      access_token: token,
      usuario: {
        id: usuario.id.toString(),
        nombre_completo: usuario.nombre_completo,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }

  // GENERAR TOKEN JWT
  private async generarToken(usuario: {
    id: bigint;
    correo: string;
    nombre_usuario: string;
    nombre_completo: string;
    rol: string;
  }): Promise<string> {
    const payload = {
      sub: usuario.id.toString(),
      correo: usuario.correo,
      nombre_usuario: usuario.nombre_usuario,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
    };

    return this.jwtService.signAsync(payload);
  }

  // OBTENER PERFIL
  async obtenerPerfil(id: string) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: {
        id: BigInt(id),
      },
      select: {
        id: true,
        nombre_completo: true,
        nombre_usuario: true,
        correo: true,
        foto_perfil: true,
        biografia: true,
        estado: true,
        rol: true,
        creado_en: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...usuario,
      id: usuario.id.toString(),
    };
  }
}