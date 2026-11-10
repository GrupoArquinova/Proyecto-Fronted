import { expect, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';

const esEnvio = (r: { url(): string; method(): string }) => r.url().endsWith('/wallet/enviar-pase') && r.method() === 'POST';

test.beforeEach(async ({ page }) => {
  await simularBackend(page);
});

test.describe('tarjeta de Google Wallet (pie de la página de inicio)', () => {
  test('se ofrece en el pie del inicio y NO suelta en otras pantallas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Llévanos en tu celular' })).toBeVisible();
    await expect(page.locator('footer.footer-arquinova app-solicitud-wallet')).toHaveCount(1);

    await page.goto('/proyectos');
    await expect(page.locator('app-solicitud-wallet')).toHaveCount(0);
  });

  test('escribir el correo y enviarlo manda la petición y confirma', async ({ page }) => {
    await page.route(/\/api\/wallet\/enviar-pase$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"mensaje":"ok"}' }));
    await page.goto('/');
    const correo = page.getByLabel('Tu correo electrónico');
    await correo.scrollIntoViewIfNeeded();
    await correo.fill('cliente@correo.com');

    const [peticion] = await Promise.all([
      page.waitForRequest(esEnvio),
      page.getByRole('button', { name: 'Enviar a mi correo' }).click()
    ]);
    expect(peticion.postDataJSON()).toEqual({ email: 'cliente@correo.com' });
    await expect(page.getByText('Revisa tu bandeja de entrada')).toBeVisible();
    await expect(correo).toHaveValue('');
    // El formulario no recarga la página
    await expect(page).toHaveURL(/\/$/);
  });

  test('un correo sin formato no se envía; si la tarjeta está apagada en el servidor se explica sin tecnicismos', async ({ page }) => {
    let envios = 0;
    await page.route(/\/api\/wallet\/enviar-pase$/, route => {
      envios++;
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"mensaje":"detalle interno"}' });
    });
    await page.goto('/');
    const correo = page.getByLabel('Tu correo electrónico');
    await correo.scrollIntoViewIfNeeded();

    await correo.fill('sin-arroba');
    await page.getByRole('button', { name: 'Enviar a mi correo' }).click();
    await expect(page.getByText('Escribe un correo válido')).toBeVisible();
    expect(envios).toBe(0);

    await correo.fill('cliente@correo.com');
    await page.getByRole('button', { name: 'Enviar a mi correo' }).click();
    await expect(page.getByText('no está disponible por ahora')).toBeVisible();
    await expect(page.getByText('detalle interno')).toHaveCount(0);
  });
});
