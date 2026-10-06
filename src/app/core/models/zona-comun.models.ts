import { ZonaComunImagen } from './zona-comun-imagen.models';

export interface ZonaComun {
  id?: number;
  proyectoId: number;
  proyectoNombre?: string;
  nombre: string;
  descripcion: string;
  publicado: boolean;
  activo: boolean;
  creadoEn?: string;
  // Solo en las consultas públicas: galería ya incluida en la respuesta
  imagenes?: ZonaComunImagen[];
  imagenPrincipalUrl?: string;
}