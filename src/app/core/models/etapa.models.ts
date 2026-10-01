export interface ProyectoRef {
  id: number;
  nombre: string;
}

// Estructura que coincide con EtapaResponseDTO del Backend
export interface Etapa {
  id?: number;
  proyectoId: number;
  proyectoNombre?: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
  creadoEn?: string;
  
  // Campo auxiliar para compatibilidad con la vista
  proyecto?: ProyectoRef;
}

// Estructura para crear/actualizar (EtapaRequestDTO)
export interface EtapaRequest {
  proyectoId: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}