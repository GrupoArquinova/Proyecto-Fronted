import { expect, test } from '@playwright/test';
import { PROYECTO_ID, simularBackend } from './datos-simulados';

test.describe('compartir y brochure', () => {
  test.beforeEach(async ({ page }) => {
    await simularBackend(page);
  });

  test('el micrositio ofrece el brochure en PDF del proyecto', async ({ page }) => {
    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);
    const enlace = page.locator('.menu-pie a.btn-brochure');
    await expect(enlace).toBeVisible();
    await expect(enlace).toHaveAttribute('href', new RegExp(`/api/proyectos/${PROYECTO_ID}/brochure\\.pdf$`));
    await expect(enlace).toHaveAttribute('target', '_blank');
    await expect(enlace).toHaveAccessibleName(/brochure de El Encanto/);
  });

  test('sin Web Share API abre el menú con las redes y "Copiar enlace" confirma de forma accesible', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
    const eventos: string[] = [];
    await page.route('**/api/analitica/evento', route => { eventos.push(route.request().postDataJSON().tipo); return route.fulfill({ status: 204 }); });
    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);

    const boton = page.locator('.menu-pie .btn-compartir');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    const items = page.locator('.menu-pie .menu-compartir li');
    await expect(items).toHaveText(['WhatsApp', 'Facebook', 'X (Twitter)', 'Correo electrónico', 'Copiar enlace']);
    await expect(items.first().locator('a')).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*proyectos%2F6/);

    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(page.locator('.menu-pie [role="status"]')).toHaveText('Enlace copiado al portapapeles');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/proyectos/${PROYECTO_ID}`);
    await expect.poll(() => eventos).toContain('COMPARTIR');

    await page.keyboard.press('Escape');
    await expect(page.locator('.menu-pie .menu-compartir')).toHaveCount(0);
    await expect(boton).toBeFocused();
  });

  test('con Web Share API usa el menú del dispositivo con título, texto y dirección', async ({ page }) => {
    await page.addInitScript(() => {
      (navigator as unknown as { share: (d: unknown) => Promise<void> }).share = async d => { (window as unknown as { __compartido: unknown }).__compartido = d; };
    });
    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);
    await page.locator('.menu-pie .btn-compartir').click();
    const datos = await page.evaluate(() => (window as unknown as { __compartido: { title: string; text: string; url: string } }).__compartido);
    expect(datos.title).toBe('El Encanto · Grupo Arquinova');
    expect(datos.text).toContain('El Encanto en La Tebaida, Quindío');
    expect(datos.url).toMatch(new RegExp(`/proyectos/${PROYECTO_ID}$`));
    await expect(page.locator('.menu-pie .menu-compartir')).toHaveCount(0);
  });

  test('las tarjetas del listado también ofrecen compartir y brochure', async ({ page }) => {
    await page.goto('/proyectos');
    const tarjeta = page.locator('.project-card').first();
    await expect(tarjeta.locator('a.btn-brochure')).toHaveAttribute('href', new RegExp(`/proyectos/${PROYECTO_ID}/brochure\\.pdf$`));
    await expect(tarjeta.getByRole('button', { name: /Compartir El Encanto/ })).toBeVisible();
  });

  test('en inglés los botones cambian de idioma', async ({ browser }) => {
    const contexto = await browser.newContext({ locale: 'en-US', baseURL: 'http://localhost:4300' });
    const page = await contexto.newPage();
    await simularBackend(page);
    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);
    await expect(page.locator('.menu-pie a.btn-brochure')).toContainText('Download brochure (PDF)');
    await expect(page.locator('.menu-pie .btn-compartir')).toContainText('Share');
    await contexto.close();
  });
});
