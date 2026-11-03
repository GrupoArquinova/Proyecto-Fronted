/** Token JWT de mentira (sin firma real) para las pruebas: lleva el rol, el nombre y el vencimiento que se pidan. */
export function jwtFalso(roles: string[], extra: Record<string, unknown> = {}): string {
  const codificar = (obj: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${codificar({ alg: 'none' })}.${codificar({ sub: 'persona@arquinova.co', nombre: 'Persona de Prueba', roles, exp, ...extra })}.firma`;
}

/** Guarda en localStorage una sesión con esos roles (los tests deben limpiar con localStorage.clear()). */
export function iniciarSesionFalsa(...roles: string[]): void {
  localStorage.setItem('jwt_token', jwtFalso(roles));
}
