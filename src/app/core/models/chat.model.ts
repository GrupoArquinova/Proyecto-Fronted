export interface ChatMessage {
    remitente: 'usuario' | 'ia';
    texto: string;
    fecha: Date;
}