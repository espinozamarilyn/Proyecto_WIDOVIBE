import { authService } from '../services/api/auth.service';

class AuthGuard {
  async protegerRuta(): Promise<boolean> {
    if (!authService.estaAutenticado()) {
      this.redirigirLogin();
      return false;
    }

    try {
      await authService.obtenerPerfil();
      return true;
    } catch {
      authService.cerrarSesion();
      this.redirigirLogin();
      return false;
    }
  }

  private redirigirLogin(): void {
    const returnUrl =
      window.location.pathname + window.location.search;

    window.location.replace(
      `/login/?returnUrl=${encodeURIComponent(returnUrl)}`
    );
  }
}

export const authGuard = new AuthGuard();