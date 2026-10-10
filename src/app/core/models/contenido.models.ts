export interface ContenidoInstitucional {
  id?: number;
  empresaId: number;
  seccion: string;          // Ej: 'descripcion', 'contacto', 'trayectoria'
  titulo: string;
  contenido: string;
  tituloEn?: string | null;
  contenidoEn?: string | null;
  publicado: boolean;
  actualizadoPorNombre?: string; // Nombre del usuario que hizo el último cambio
  actualizadoEn?: string;
}