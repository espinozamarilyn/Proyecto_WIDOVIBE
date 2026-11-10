export interface Mensaje {
  id: string;
  conversacionId: string | null;
  canalId?: string | null;
  remitenteId: string;
  contenido: string | null;
  tipo: string;
  creadoEn: string | null;
  editadoEn?: string | null;
  entregadoEn?: string | null;
  leidoEn?: string | null;
}

export interface EnviarMensajeRequest {
  contenido: string;
  claveIdempotencia?: string;
}