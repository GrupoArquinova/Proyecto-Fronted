import { Page } from '@playwright/test';

/** Sesión simulada del panel: un JWT sin firma real, con vencimiento lejano y los roles indicados. */
export async function iniciarSesion(page: Page, ...roles: string[]): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ sub: 'persona@arquinova.com', nombre: 'Persona de Prueba', roles, exp: 4102444800 })).toString('base64url');
  await page.addInitScript(valor => localStorage.setItem('jwt_token', valor), `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`);
}
