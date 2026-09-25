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
}