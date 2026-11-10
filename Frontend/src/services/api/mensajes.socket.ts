
import { io, Socket } from "socket.io-client";
import { apiService } from "./api.service";

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

const SOCKET_URL = API_URL
  ? API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "")
  : "http://localhost:3000";

interface RespuestaSocket<T = unknown> {
  evento: string;
  mensaje?: string;
  resultado?: T;
  [key: string]: unknown;
}

interface DatosMensaje {
  conversacionId: string;
  contenido: string;
  claveIdempotencia?: string;
}

interface DatosConversacion {
  conversacionId: string;
}

interface DatosMensajeLeido {
  conversacionId: string;
  mensajeId: string;
}

class MensajesSocketService {
  private socket: Socket | null = null;
  private tokenActual: string | null = null;

  conectar(): Socket {
    if (typeof window === "undefined") {
      throw new Error("La conexión de mensajes solo está disponible en el navegador.");
    }

    const token = apiService.obtenerTokenGuardado();

    if (!token) {
      throw new Error("Debes iniciar sesión para conectarte a los mensajes.");
    }

    if (this.socket && this.tokenActual === token) {
      if (!this.socket.connected) {
        this.socket.connect();
      }

      return this.socket;
    }

    this.desconectar();

    this.tokenActual = token;

    this.socket = io(`${SOCKET_URL}/mensajes`, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    return this.socket;
  }

  obtenerSocket(): Socket | null {
    return this.socket;
  }

  estaConectado(): boolean {
    return this.socket?.connected ?? false;
  }

  desconectar(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.tokenActual = null;
    }
  }

  unirseConversacion(conversacionId: string): void {
    this.validarConexion();

    this.socket!.emit("conversacion:unirse", {
      conversacionId,
    } satisfies DatosConversacion);
  }

  salirConversacion(conversacionId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit("conversacion:salir", {
      conversacionId,
    } satisfies DatosConversacion);
  }

  enviarMensaje(datos: DatosMensaje): Promise<RespuestaSocket> {
    return this.emitirConRespuesta("mensaje:enviar", datos);
  }

  marcarLeido(datos: DatosMensajeLeido): Promise<RespuestaSocket> {
    return this.emitirConRespuesta("mensaje:leido", datos);
  }

  escuchar(
    evento: string,
    callback: (datos: unknown) => void,
  ): () => void {
    this.validarConexion();

    this.socket!.on(evento, callback);

    return () => {
      this.socket?.off(evento, callback);
    };
  }

  private emitirConRespuesta<T>(
    evento: string,
    datos: T,
  ): Promise<RespuestaSocket> {
    this.validarConexion();

    return new Promise((resolve, reject) => {
      this.socket!.timeout(10000).emit(
        evento,
        datos,
        (
          error: Error | null,
          respuesta: RespuestaSocket,
        ) => {
          if (error) {
            reject(new Error("El servidor no respondió a tiempo."));
            return;
          }

          if (!respuesta) {
            reject(new Error("El servidor devolvió una respuesta vacía."));
            return;
          }

          if (respuesta.evento === "error") {
            reject(new Error(respuesta.mensaje || "Ocurrió un error en el servidor."));
            return;
          }

          resolve(respuesta);
        },
      );
    });
  }

  private validarConexion(): void {
    if (!this.socket?.connected) {
      throw new Error("No hay conexión con el servidor de mensajes.");
    }
  }
}

export const mensajesSocket = new MensajesSocketService();
