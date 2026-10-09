/** Estado de atención de una solicitud (NUEVO, EN_GESTION, CERRADO). */
export interface EstadoSolicitud {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface Solicitud {
  id: number;
  estadoId: number;
  estadoNombre?: string;
  proyectoId?: number;
  proyectoNombre?: string;
  loteId?: number;
  loteCodigo?: string;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  servicioInteres?: string | null;
  mensaje?: string;
  consentimientoDatos: boolean;
  atendidaPorNombre?: string;
  atendidaEn?: string;
  observacionesInternas?: string;
  creadoEn: string;
}

/** Cuerpo del formulario de contacto público (POST /solicitudes-contacto/publico). */
export interface SolicitudPublicaRequest {
  nombre: string;
  /** Basta con uno de los dos: teléfono o correo. */
  correo?: string;
  telefono?: string;
  servicioInteres?: string;
  /** Idioma del sitio cuando la persona escribió ("es" o "en"). */
  idioma?: string;
  proyectoId: number | null;
  loteId?: number | null;
  mensaje?: string;
  consentimientoDatos: boolean;
  userAgent?: string;
}
