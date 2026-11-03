export interface Usuario {
  id?: number;
  rolId: number;
  /** Nombre del rol (por ejemplo "ADMINISTRADOR"), si el backend lo envía junto al usuario. */
  rolNombre?: string;
  nombreCompleto: string;
  correo: string;
  password?: string;   // ← antes: passwordHash. Contraseña en texto plano que el admin escribe.
  activo: boolean;
}