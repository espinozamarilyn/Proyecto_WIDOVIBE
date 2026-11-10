import { apiService } from './api.service';

import type {
  AuthResponse,
  LoginRequest,
  RegistroRequest,
  Usuario,
} from '../../types/auth.types';

class AuthService {
  private readonly usuarioKey = 'chatmod_usuario';

  async login(datos: LoginRequest): Promise<AuthResponse> {
    const respuesta = await apiService.post<AuthResponse>(
      '/auth/login',
      datos
    );

    this.guardarSesion(respuesta);

    return respuesta;
  }

  async registro(datos: RegistroRequest): Promise<AuthResponse> {
    const respuesta = await apiService.post<AuthResponse>(
      '/auth/registro',
      datos
    );

    this.guardarSesion(respuesta);

    return respuesta;
  }

  async obtenerPerfil(): Promise<Usuario> {
    const usuario = await apiService.get<Usuario>('/auth/perfil');

    this.guardarUsuario(usuario);

    return usuario;
  }

  obtenerUsuarioGuardado(): Usuario | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const usuario = localStorage.getItem(this.usuarioKey);

    if (!usuario) {
      return null;
    }

    try {
      return JSON.parse(usuario) as Usuario;
    } catch {
      localStorage.removeItem(this.usuarioKey);
      return null;
    }
  }

  estaAutenticado(): boolean {
    return apiService.tieneSesion();
  }

  cerrarSesion(): void {
    apiService.eliminarToken();

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.usuarioKey);
    }
  }

  private guardarSesion(respuesta: AuthResponse): void {
    apiService.guardarToken(respuesta.access_token);
    this.guardarUsuario(respuesta.usuario);
  }

  private guardarUsuario(usuario: Usuario): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        this.usuarioKey,
        JSON.stringify(usuario)
      );
    }
  }
}

export const authService = new AuthService();