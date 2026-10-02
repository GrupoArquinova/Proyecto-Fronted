export interface CasaModelo {
  id?: number;
  proyectoId: number;
  nombre: string;
  descripcion?: string;
  areaConstruidaM2?: number;
  numeroHabitaciones?: number;
  numeroBanos?: number;
  tourVirtualUrl?: string;
  planoUrl?: string;
  publicado: boolean;
  activo: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  
  // Propiedad opcional para mostrar el nombre del proyecto en la tarjeta o tabla si el backend lo incluye
  proyectoNombre?: string;
}