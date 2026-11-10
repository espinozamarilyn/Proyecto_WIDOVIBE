import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  correo: string;
  nombre_usuario: string;
  nombre_completo: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    let usuarioId: bigint;

    try {
      usuarioId = BigInt(payload.sub);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    const usuario = await this.prisma.usuarios.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        id: true,
        correo: true,
        nombre_usuario: true,
        nombre_completo: true,
        rol: true,
        estado: true,
      },
    });

    if (!usuario || usuario.estado !== 'activo') {
      throw new UnauthorizedException(
        'La cuenta no existe o no está activa',
      );
    }

    return {
      id: usuario.id.toString(),
      correo: usuario.correo,
      nombre_usuario: usuario.nombre_usuario,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
    };
  }
}