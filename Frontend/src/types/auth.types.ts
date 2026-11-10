export interface Usuario {
  id: string;
  nombre_completo: string;
  nombre_usuario: string;
  correo: string;
  rol: string;
}

export interface RegistroRequest {
  nombre_completo: string;
  nombre_usuario: string;
  correo: string;
  password: string;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthResponse {
  mensaje: string;
  access_token: string;
  usuario: Usuario;
}