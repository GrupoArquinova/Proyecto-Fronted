export interface Ubicacion {
  id?: number;
  proyectoId: number;
  proyectoNombre?: string; // Para mostrarlo en la card
  direccion?: string;
  ciudad: string;
  departamento: string;
  referencias?: string;
  latitud?: number;
  longitud?: number;
  googleMapsUrl?: string;
  urbanismoUrl?: string;
  vistaAereaUrl?: string;
  recorrido360Url?: string;
  videoComoLlegarUrl?: string;
}