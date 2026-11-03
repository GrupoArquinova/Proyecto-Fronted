/** Un registro del historial de cambios del panel (quién hizo qué y cuándo). */
export interface RegistroAuditoria {
  id: number;
  usuarioId?: number | null;
  /** Nombre de quien hizo el cambio. */
  usuarioNombre: string;
  /** Acción, por ejemplo "CREAR_USUARIO". */
  accion: string;
  /** Entidad afectada, por ejemplo "USUARIOS". */
  entidad: string;
  entidadId?: number | null;
  descripcion?: string | null;
  creadoEn: string;
}

/** Página del historial: GET /api/admin/auditoria. */
export interface PaginaAuditoria {
  contenido: RegistroAuditoria[];
  /** Número de página (empieza en 0). */
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

/** GET /api/admin/auditoria/filtros: los valores que existen, para los selectores. */
export interface FiltrosAuditoria {
  entidades: string[];
  acciones: string[];
}

export interface FiltroAuditoria {
  usuarioId?: number | null;
  entidad?: string;
  accion?: string;
  /** Búsqueda libre en la descripción. */
  texto?: string;
  /** YYYY-MM-DD */
  desde?: string;
  /** YYYY-MM-DD */
  hasta?: string;
  page?: number;
  size?: number;
}
