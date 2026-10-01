export interface Usuario {
  id?: number;
  rolId: number;
  nombreCompleto: string;
  correo: string;
  passwordHash?: string;
  activo: boolean;
}