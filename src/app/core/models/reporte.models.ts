export interface DashboardResponse {
  totalProyectos: number;
  proyectosPublicados: number;
  totalLotes: number;
  lotesDisponibles: number;
  lotesReservados: number;
  lotesVendidos: number;
  totalSolicitudes: number;
  solicitudesNuevas: number;
  distribucionLotesPorEstado: Record<string, number>;
  distribucionSolicitudesPorEstado: Record<string, number>;
}

export interface LoteReporteItem {
  id: number;
  proyectoNombre: string;
  etapaNombre: string;
  codigo: string;
  loteNombre: string;
  areaM2: number;
  estadoComercial: string;
  publicado: boolean;
  activo: boolean;
  creadoEn: string;
}

export interface SolicitudReporteItem {
  id: number;
  proyectoNombre: string;
  loteCodigo: string;
  clienteNombre: string;
  clienteCorreo: string;
  clienteTelefono: string;
  estadoNombre: string;
  atendidaPorNombre: string;
  creadoEn: string;
  tipologiaNombre?: string;
  mensaje?: string;
  atendidaEn?: string | null;
}

export interface ProyectoReporteItem {
  id: number;
  empresaNombre: string;
  nombre: string;
  estadoProyecto: string;
  publicado: boolean;
  activo: boolean;
  fechaLanzamiento?: string | null;
  totalLotes: number;
  creadoEn: string;
}

export interface EstadoComercialItem {
  proyectoId: number;
  proyectoNombre: string;
  estadoNombre: string;
  cantidadLotes: number;
  porcentaje: number;
}

export interface EtapaReporteItem {
  proyectoId: number;
  proyectoNombre: string;
  etapaId: number;
  etapaNombre: string;
  totalLotes: number;
  disponibles: number;
  reservados: number;
  vendidos: number;
  areaTotalM2: number;
}

export interface ActividadReporteItem {
  id: number;
  usuarioNombre: string;
  usuarioCorreo: string;
  accion: string;
  entidad: string;
  entidadId?: number | null;
  descripcion?: string | null;
  ip?: string | null;
  creadoEn: string;
}

/** Filtros de los reportes; los que no se llenan no se envían. */
export interface FiltroReporte {
  proyectoId?: number | null;
  estadoLoteId?: number | null;
  estadoSolicitudId?: number | null;
  estadoProyecto?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  incluirInactivos?: boolean;
}

/** Los reportes que se pueden ver en pantalla y exportar. */
export type ReporteId = 'lotes' | 'proyectos' | 'etapas' | 'estados-comerciales' | 'solicitudes' | 'actividad';

export interface DashboardStats {
  totalProyectos: number;
  totalLotes: number;
  totalSolicitudes: number;
  lotesDisponibles: number;
  lotesReservados: number;
  lotesVendidos: number;
}