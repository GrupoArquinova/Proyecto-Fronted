import { expect, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';

/**
 * Celular en horizontal: pantalla muy baja (≈ 360 px de alto). Aquí se rompían dos cosas:
 * el formulario de WhatsApp quedaba recortado arriba y el menú del panel de administración no dejaba ver
 * las secciones de abajo ni "Cerrar sesión".
 */
test.use({ viewport: { width: 800, height: 360 } });

test.beforeEach(async ({ page }) => {
  // Cualquier otra llamada al API (panel de administración) responde vacío; las del sitio público usan los datos simulados
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await simularBackend(page);
});

const dentroDeLaPantalla = async (page: import('@playwright/test').Page, selector: string) => {
  const caja = await page.locator(selector).first().boundingBox();
  const vista = page.viewportSize()!;
  expect(caja, `${selector} debe existir`).not.toBeNull();
  expect(caja!.y, `${selector}: borde superior`).toBeGreaterThanOrEqual(0);
  expect(caja!.x, `${selector}: borde izquierdo`).toBeGreaterThanOrEqual(0);
  expect(caja!.y + caja!.height, `${selector}: borde inferior`).toBeLessThanOrEqual(vista.height + 0.5);
  expect(caja!.x + caja!.width, `${selector}: borde derecho`).toBeLessThanOrEqual(vista.width + 0.5);
};

test.describe('celular en horizontal', () => {
  test('el formulario de WhatsApp cabe completo en pantalla, con la X y el botón a la vista', async ({ page }) => {
    await page.goto('/');
    await page.locator('.whatsapp-btn-float').click();

    await expect(page.locator('.whatsapp-modal-card')).toBeVisible();
    await page.waitForTimeout(400); // termina la animación de entrada
    await dentroDeLaPantalla(page, '.whatsapp-modal-container');
    await dentroDeLaPantalla(page, '.whatsapp-modal-card .modal-header');
    await dentroDeLaPantalla(page, '.whatsapp-modal-card .close-btn');
    await dentroDeLaPantalla(page, '.btn-submit-chat');
  });

  test('en inglés el formulario de WhatsApp está en inglés', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();
    await page.locator('.whatsapp-btn-float').click();

    await expect(page.locator('.modal-title')).toHaveText('Talk to an Advisor');
    await expect(page.getByPlaceholder('Full name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start chat' })).toBeVisible();

    // Sin datos: el aviso sale en inglés
    await page.getByRole('button', { name: 'Start chat' }).click();
    await expect(page.getByRole('alert')).toHaveText('Please fill in all the fields');
  });

  test('el aviso de girar la pantalla (celular en vertical) sale en el idioma del sitio', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gira tu pantalla' })).toBeVisible();

    await page.evaluate(() => localStorage.setItem('idioma', 'en'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Rotate your screen' })).toBeVisible();
    await expect(page.locator('.rotate-card')).toContainText('landscape');
  });

  test('el menú del panel de administración se desplaza y "Cerrar sesión" siempre está a la vista', async ({ page }) => {
    // Sesión simulada: un JWT sin firma real, con vencimiento lejano (el panel solo revisa que no haya expirado)
    const payload = Buffer.from(JSON.stringify({ sub: 'admin@arquinova.com', exp: 4102444800 })).toString('base64url');
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`;
    await page.addInitScript(valor => localStorage.setItem('jwt_token', valor), token);

    await page.goto('/admin/resumen');
    await expect(page.locator('app-sidebar')).toBeVisible();

    // Cerrar sesión no se tapa aunque la pantalla sea baja
    await dentroDeLaPantalla(page, '.sidebar-footer .logout-button');

    // El menú se desplaza hasta la última sección
    const nav = page.locator('.sidebar-nav');
    expect(await nav.evaluate(el => el.scrollHeight > el.clientHeight), 'el menú debe poder desplazarse en una pantalla baja').toBe(true);
    await nav.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByRole('link', { name: 'Reportes' })).toBeInViewport();
    await expect(page.getByRole('link', { name: 'Solicitudes' })).toBeVisible();
  });
});
