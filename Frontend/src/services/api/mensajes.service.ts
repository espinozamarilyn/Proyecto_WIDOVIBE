import { apiService } from "./api.service";

import type {
  Mensaje,
  EnviarMensajeRequest,
} from "../../types/mensaje.types";

class MensajesService {
  listar(conversacionId: string): Promise<Mensaje[]> {
    return apiService.get<Mensaje[]>(
      `/mensajes/conversacion/${conversacionId}?limite=100`
    );
  }

  enviar(
    conversacionId: string,
    datos: EnviarMensajeRequest
  ): Promise<Mensaje> {
    return apiService.post<Mensaje>(
      `/mensajes/conversacion/${conversacionId}`,
      datos
    );
  }

  marcarEntregado(
    conversacionId: string,
    mensajeId: string
  ): Promise<unknown> {
    return apiService.patch(
      `/mensajes/conversacion/${conversacionId}/${mensajeId}/entregado`
    );
  }

  marcarLeido(
    conversacionId: string,
    mensajeId: string
  ): Promise<unknown> {
    return apiService.patch(
      `/mensajes/conversacion/${conversacionId}/${mensajeId}/leido`
    );
  }
}

export const mensajesService = new MensajesService();