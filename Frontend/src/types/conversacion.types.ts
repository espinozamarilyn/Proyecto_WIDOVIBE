export interface ParticipanteConversacion {
  id: string;
  nombre_completo: string;
  nombre_usuario: string;
  foto_perfil: string | null;
  rol: string;
}

export interface UltimoMensaje {
  id: string;
  remitente_id: string;
  contenido: string | null;
  tipo: string;
  creado_en: string | null;
}

export interface Conversacion {
  id: string;
  tipo: string;
  nombre: string | null;
  descripcion: string | null;
  foto: string | null;
  creado_en: string | null;
  participantes: ParticipanteConversacion[];
  ultimo_mensaje: UltimoMensaje | null;
}

export interface CrearConversacionIndividualResponse {
  mensaje: string;
  conversacion: {
    id: string;
    tipo: string;
    creado_en: string | null;
  };
}