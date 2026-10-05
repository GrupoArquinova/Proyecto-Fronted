export type EstadoProyecto = 'PLANIFICACION' | 'EN_CONSTRUCCION' | 'ENTREGADO' | 'FINALIZADO';

export interface Proyecto {
  id?: number;
  empresaId: number;
  nombre: string;
  slug?: string;
  descripcion?: string;
  estadoProyecto?: EstadoProyecto;
  publicado?: boolean;
  activo?: boolean;
  fechaLanzamiento?: string;
  imagenUrl?: string;
  // Datos de presentación que el backend puede enviar para las páginas públicas
  estado?: string;
  ubicacion?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CrearProyectoDTO {
  nombre: string;
  empresaId: number;
  slug?: string;
  descripcion?: string;
  estadoProyecto?: EstadoProyecto;
  publicado?: boolean;
  imagenUrl?: string;
  fechaLanzamiento?: string;
}


/** Proyecto listo para mostrar en las páginas públicas (con valores por defecto y conteo de lotes). */
export interface ProyectoPublico extends Proyecto {
  id: number;
  imagenUrl: string;
  estado: string;
  ubicacion: string;
  descripcion: string;
  totalLotes: number;
  lotesDisponibles: number;
}

/** Catálogo público: todos los proyectos enriquecidos + total de lotes publicados. */
export interface CatalogoPublico {
  proyectos: ProyectoPublico[];
  totalLotes: number;
}
