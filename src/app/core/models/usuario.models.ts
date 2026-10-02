export interface Usuario {
  id?: number;
  rolId: number;
  nombreCompleto: string;
  correo: string;
  password?: string;   // ← antes: passwordHash. Contraseña en texto plano que el admin escribe.
  activo: boolean;
}