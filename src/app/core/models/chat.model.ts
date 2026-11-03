export interface ChatMessage {
    remitente: 'usuario' | 'ia';
    texto: string;
    fecha: Date;
    /** Aviso de error del propio widget: se muestra pero no forma parte de la conversación enviada a la IA. */
    error?: boolean;
}

/** Un turno de la conversación tal como lo espera el backend. */
export interface ChatTurno {
    rol: 'user' | 'model';
    texto: string;
}
