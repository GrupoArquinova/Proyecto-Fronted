import { expect, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';

test.beforeEach(async ({ page }) => {
  await simularBackend(page);
});

test.describe('inicio: misión, visión y valores', () => {
  test('solo salen los textos publicados y con el nombre fijo, no con el título del panel', async ({ page }) => {
    await page.goto('/');
    const tarjetas = page.locator('#empresa .identity-card');
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first().getByRole('heading', { name: 'Misión' })).toBeVisible();
    await expect(tarjetas.first()).toContainText('Acompañar a propietarios y promotores');

    await expect(page.locator('#empresa')).not.toContainText('propuesta');
    await expect(page.locator('#empresa')).not.toContainText('sin aprobar');
    await expect(page.locator('#empresa')).not.toContainText('manual de marca');
  });

  test('la empresa va después de servicios y proyectos, y el menú sigue ese orden', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('section[id]').evaluateAll(secciones => secciones.map(s => s.id));
    expect(ids.indexOf('servicios')).toBeLessThan(ids.indexOf('proyectos'));
    expect(ids.indexOf('proyectos')).toBeLessThan(ids.indexOf('empresa'));
    expect(ids.indexOf('empresa')).toBeLessThan(ids.indexOf('contacto'));

    const menu = await page.locator('header nav a.nav-item').allInnerTexts();
    expect(menu.indexOf('Servicios')).toBeLessThan(menu.indexOf('Proyectos'));
    expect(menu.indexOf('Proyectos')).toBeLessThan(menu.indexOf('Empresa'));
  });

  test('sin textos publicados la sección Empresa no muestra tarjetas', async ({ page }) => {
    await page.route('**/api/contenidos-institucionales/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/');
    await expect(page.locator('#empresa h2')).toHaveText('Quiénes somos');
    await expect(page.locator('#empresa .identity-card')).toHaveCount(0);
  });
});
