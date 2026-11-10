export interface Ubicacion {
  id?: number;
  proyectoId: number;
  proyectoNombre?: string; // Para mostrarlo en la card
  direccion?: string;
  ciudad: string;
  departamento: string;
  referencias?: string;
  referenciasEn?: string | null;
  latitud?: number;
  longitud?: number;
  googleMapsUrl?: string;
  urbanismoUrl?: string;
  /** El mismo plano con su texto en inglés (opcional). */
  urbanismoUrlEn?: string;
  vistaAereaUrl?: string;
  recorrido360Url?: string;
  videoComoLlegarUrl?: string;
}