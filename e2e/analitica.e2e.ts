import { expect, test } from '@playwright/test';
import { PROYECTO_ID, simularBackend } from './datos-simulados';
import { iniciarSesion } from './sesion';

interface Evento { tipo: string; proyectoId?: number; ruta?: string }

/** Registra los eventos que el sitio manda a la analítica (y los responde 204 como el backend). */
async function capturar(page: import('@playwright/test').Page): Promise<Evento[]> {
  const eventos: Evento[] = [];
  await simularBackend(page);
  await page.route('**/api/analitica/evento', route => {
    eventos.push(route.request().postDataJSON() as Evento);
    return route.fulfill({ status: 204 });
  });
  // Los enlaces de WhatsApp abren otra pestaña: no se sale a internet
  await page.context().route('https://wa.me/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }));
  return eventos;
}

test.describe('analítica sin cookies', () => {
  test('cuenta la vista de página y la visita al proyecto (una sola vez), sin cookies ni almacenamiento', async ({ page }) => {
    const eventos = await capturar(page);
    await page.goto('/proyectos?filtro=1#x');
    await expect.poll(() => eventos.map(e => e.tipo)).toContain('VISTA_PAGINA');
    expect(eventos.find(e => e.tipo === 'VISTA_PAGINA')).toMatchObject({ ruta: '/proyectos' });

    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);
    await expect.poll(() => eventos.filter(e => e.tipo === 'VISTA_PROYECTO').length).toBe(1);
    expect(eventos.find(e => e.tipo === 'VISTA_PROYECTO')).toMatchObject({ proyectoId: PROYECTO_ID });

    // Cambiar de sección dentro del proyecto cuenta otra página, pero no otra visita al proyecto
    await page.goto(`/proyectos/${PROYECTO_ID}/contacto`);
    await expect.poll(() => eventos.filter(e => e.tipo === 'VISTA_PAGINA').length).toBeGreaterThanOrEqual(3);
    expect(eventos.filter(e => e.tipo === 'VISTA_PROYECTO').length).toBeGreaterThanOrEqual(1);

    expect(await page.context().cookies()).toEqual([]);
    const claves = await page.evaluate(() => Object.keys(localStorage));
    expect(claves.filter(c => /anal|visit|evento|track/i.test(c))).toEqual([]);
  });

  test('cambiar de sección con el menú no cuenta otra visita al proyecto', async ({ page }) => {
    const eventos = await capturar(page);
    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);
    await expect.poll(() => eventos.filter(e => e.tipo === 'VISTA_PROYECTO').length).toBe(1);
    await page.locator('.menu-seccion', { hasText: 'Contacto' }).click();
    await expect.poll(() => eventos.some(e => e.tipo === 'VISTA_PAGINA' && e.ruta === `/proyectos/${PROYECTO_ID}/contacto`)).toBe(true);
    expect(eventos.filter(e => e.tipo === 'VISTA_PROYECTO')).toHaveLength(1);
  });

  test('cuenta el clic en WhatsApp del proyecto, con su id', async ({ page }) => {
    const eventos = await capturar(page);
    await page.goto(`/proyectos/${PROYECTO_ID}/contacto`);
    await page.locator('.pie a', { hasText: 'WhatsApp' }).click();
    await expect.poll(() => eventos.some(e => e.tipo === 'CLICK_WHATSAPP')).toBe(true);
    expect(eventos.find(e => e.tipo === 'CLICK_WHATSAPP')).toMatchObject({ proyectoId: PROYECTO_ID });
  });

  test('con "No rastrear" activo no se envía ningún evento', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true }));
    const eventos = await capturar(page);
    await page.goto('/proyectos');
    await page.goto(`/proyectos/${PROYECTO_ID}/contacto`);
    await page.locator('.pie a', { hasText: 'WhatsApp' }).click();
    await page.waitForTimeout(800);
    expect(eventos).toEqual([]);
  });

  test('el panel de administración no envía eventos', async ({ page }) => {
    await iniciarSesion(page, 'ROLE_ADMINISTRADOR');
    const eventos = await capturar(page);
    await page.route('**/api/reportes/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/admin/resumen');
    await page.waitForTimeout(800);
    expect(eventos).toEqual([]);
  });

  test('si el backend de analítica falla, la página sigue funcionando', async ({ page }) => {
    await simularBackend(page);
    await page.route('**/api/analitica/evento', route => route.abort());
    await page.goto('/proyectos');
    await expect(page.locator('.project-card').first()).toBeVisible();
  });
});
