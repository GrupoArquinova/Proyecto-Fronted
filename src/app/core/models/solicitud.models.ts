export interface Solicitud {
  id: number;
  estadoId: number;
  estadoNombre?: string;
  proyectoId?: number;
  proyectoNombre?: string;
  loteId?: number;
  loteCodigo?: string;
  nombre: string;
  correo: string;
  telefono: string;
  mensaje?: string;
  consentimientoDatos: boolean;
  atendidaPorNombre?: string;
  atendidaEn?: string;
  observacionesInternas?: string;
  creadoEn: string;
}