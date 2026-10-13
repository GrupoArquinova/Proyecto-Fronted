import { expect, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';

/**
 * Humo del panel de administración con datos simulados: las pantallas cargan y reaccionan a lo que se escribe.
 * Sirve de red de seguridad para los cambios de detección de cambios (OnPush) y de plantillas.
 */
test.beforeEach(async ({ page }) => {
  // Cualquier otra llamada al API del panel responde vacío; las del sitio público usan los datos simulados
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await simularBackend(page);

  // Sesión simulada: un JWT sin firma real, con vencimiento lejano y el rol de administrador
  const payload = Buffer.from(JSON.stringify({ sub: 'admin@arquinova.com', roles: ['ROLE_ADMINISTRADOR'], exp: 4102444800 })).toString('base64url');
  await page.addInitScript(valor => localStorage.setItem('jwt_token', valor), `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`);
});

test.describe('panel de administración', () => {
  test('sin sesión se manda al login', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('jwt_token'));
    await page.goto('/admin/resumen');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('una sesión sin rol de administrador no entra al panel', async ({ page }) => {
    const payload = Buffer.from(JSON.stringify({ sub: 'otro@arquinova.com', roles: ['ROLE_USUARIO'], exp: 4102444800 })).toString('base64url');
    await page.addInitScript(valor => localStorage.setItem('jwt_token', valor), `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`);
    await page.goto('/admin/resumen');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('el login muestra el error cuando las credenciales son incorrectas y vuelve a habilitar el botón', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('jwt_token'));
    await page.route('**/api/auth/login', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Credenciales incorrectas' }) }));
    await page.goto('/login');

    await page.locator('input[formcontrolname="correo"]').fill('alguien@arquinova.com');
    await page.locator('input[formcontrolname="password"]').fill('clave-equivocada');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  test('el login correcto lleva al panel', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('jwt_token'));
    const payload = Buffer.from(JSON.stringify({ sub: 'admin@arquinova.com', roles: ['ROLE_ADMINISTRADOR'], exp: 4102444800 })).toString('base64url');
    await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`, tipo: 'Bearer' }) }));
    await page.goto('/login');

    await page.locator('input[formcontrolname="correo"]').fill('admin@arquinova.com');
    await page.locator('input[formcontrolname="password"]').fill('una-clave');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/admin\/resumen$/);
    await expect(page.getByRole('heading', { name: 'Resumen General' })).toBeVisible();
  });

  test('el menú lleva a las pantallas del panel', async ({ page }) => {
    await page.goto('/admin/resumen');
    await expect(page.getByRole('heading', { name: 'Resumen General' })).toBeVisible();

    await page.getByRole('link', { name: 'Proyectos' }).click();
    await expect(page).toHaveURL(/\/admin\/proyectos$/);
    await page.getByRole('link', { name: 'Solicitudes' }).click();
    await expect(page).toHaveURL(/\/admin\/solicitudes$/);
  });

  test('el asistente de proyectos genera la dirección web mientras se escribe el nombre', async ({ page }) => {
    await page.goto('/admin/proyectos/nuevo');
    await expect(page.getByRole('heading', { name: 'Nuevo proyecto' })).toBeVisible();

    const nombre = page.getByPlaceholder('Condominio Campestre Los Álamos');
    await nombre.fill('Condominio Prueba Uno');
    await expect(page.getByPlaceholder('condominio-campestre-los-alamos')).toHaveValue('condominio-prueba-uno');
  });

  test('el formulario de un proyecto valida el nombre y lo muestra sin tocar nada más', async ({ page }) => {
    await page.goto('/admin/proyectos/nuevo');
    const nombre = page.getByPlaceholder('Condominio Campestre Los Álamos');
    await nombre.fill('ab');
    await nombre.blur();
    await expect(page.getByText('Escribe un nombre de al menos 3 letras.')).toBeVisible();
  });
});
