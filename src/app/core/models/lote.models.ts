export interface EstadoLote {
    id: number;
    nombre?: 'Disponible' | 'Reservado' | 'Vendido' | string;
}

export interface ProyectoRef {
    id?: number;
    nombre: string;
}

export interface Etapa {
    id: number;
    nombre?: string;
    proyecto?: ProyectoRef;
    // Campos planos que puede enviar el backend
    proyectoId?: number;
    proyectoNombre?: string;
}

// Interfaz que coincide exactamente con LoteResponseDTO del backend
export interface Lote {
  id?: number;
  codigo: string;
  nombre?: string;
  areaM2: number;
  precio?: number;
  descripcion?: string;
  descripcionEn?: string | null;
  caracteristicas?: string;
  posicionX?: number;
  posicionY?: number;
  publicado?: boolean;
  activo: boolean;

  // Campos planos del backend (LoteResponseDTO)
  proyectoId?: number;
  etapaId?: number;
  etapaNombre?: string;
  estadoId: number;
  estadoNombre?: string;
  proyectoNombre?: string;

  // Campos de auditoría
  creadoPorId?: number;
  creadoPorNombre?: string;
  actualizadoPorId?: number;
  actualizadoPorNombre?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}