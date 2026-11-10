import { apiService } from "./api.service";

import type {
  Conversacion,
  CrearConversacionIndividualResponse,
} from "../../types/conversacion.types";

class ConversacionesService {
  listar(): Promise<Conversacion[]> {
    return apiService.get<Conversacion[]>("/conversaciones");
  }

  obtenerPorId(id: string): Promise<Conversacion> {
    return apiService.get<Conversacion>(`/conversaciones/${id}`);
  }

  crearIndividual(
    contactoId: string
  ): Promise<CrearConversacionIndividualResponse> {
    return apiService.post<CrearConversacionIndividualResponse>(
      "/conversaciones/individual",
      { contactoId }
    );
  }
}

export const conversacionesService = new ConversacionesService();