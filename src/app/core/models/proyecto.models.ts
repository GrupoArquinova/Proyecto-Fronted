/** Etapa del proyecto: describe el avance; no acredita por sí sola permisos ni disponibilidad. */
export type EstadoProyecto = 'EN_DISENO' | 'EN_TRAMITE' | 'EN_CONSTRUCCION' | 'FINALIZADO';
/** Caso de portafolio (Arquinova participó) u oferta comercial (unidades a la venta). */
export type TipoRegistroProyecto = 'PORTAFOLIO' | 'OFERTA_COMERCIAL';
export type TipoProyecto = 'RESIDENCIAL' | 'RURAL' | 'TURISTICO' | 'OTRO';

export const ETAPAS_PROYECTO: { valor: EstadoProyecto; etiqueta: string }[] = [
  { valor: 'EN_DISENO', etiqueta: 'En diseño' },
  { valor: 'EN_TRAMITE', etiqueta: 'En trámite' },
  { valor: 'EN_CONSTRUCCION', etiqueta: 'En construcción' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado' }
];

export const TIPOS_REGISTRO: { valor: TipoRegistroProyecto; etiqueta: string }[] = [
  { valor: 'OFERTA_COMERCIAL', etiqueta: 'Oferta comercial (unidades a la venta)' },
  { valor: 'PORTAFOLIO', etiqueta: 'Caso de portafolio (Arquinova participó)' }
];

export const TIPOS_PROYECTO: { valor: TipoProyecto; etiqueta: string }[] = [
  { valor: 'RESIDENCIAL', etiqueta: 'Residencial' },
  { valor: 'RURAL', etiqueta: 'Rural' },
  { valor: 'TURISTICO', etiqueta: 'Turístico' },
  { valor: 'OTRO', etiqueta: 'Otro' }
];

export function etiquetaEtapa(valor?: string | null): string {
  return ETAPAS_PROYECTO.find(e => e.valor === valor)?.etiqueta ?? '';
}

export function etiquetaTipoProyecto(valor?: string | null): string {
  return TIPOS_PROYECTO.find(t => t.valor === valor)?.etiqueta ?? '';
}

export interface Proyecto {
  id?: number;
  empresaId: number;
  nombre: string;
  slug?: string;
  descripcion?: string;
  estadoProyecto?: EstadoProyecto;
  tipoRegistro?: TipoRegistroProyecto;
  tipoProyecto?: TipoProyecto | null;
  /** Papel de Arquinova (diseño, estudios, licencias, estructuración, construcción, comercialización). */
  participacion?: string | null;
  destacado?: boolean;
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
  tipoRegistro?: TipoRegistroProyecto;
  tipoProyecto?: TipoProyecto | null;
  participacion?: string | null;
  destacado?: boolean;
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
  /** Municipio de la ubicación del proyecto (para filtrar). */
  municipio: string;
  descripcion: string;
  totalLotes: number;
  lotesDisponibles: number;
}

/** Catálogo público: todos los proyectos enriquecidos + total de lotes publicados. */
export interface CatalogoPublico {
  proyectos: ProyectoPublico[];
  totalLotes: number;
}
