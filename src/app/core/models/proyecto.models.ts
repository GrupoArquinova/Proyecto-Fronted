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
