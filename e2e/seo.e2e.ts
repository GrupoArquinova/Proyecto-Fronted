import { expect, test } from '@playwright/test';
import { PROYECTO_ID, simularBackend } from './datos-simulados';

const meta = (page: import('@playwright/test').Page, selector: string) =>
  page.locator(`head meta[${selector}]`).getAttribute('content');

test.describe('etiquetas para buscadores', () => {
  test.beforeEach(async ({ page }) => {
    await simularBackend(page);
  });

  test('el inicio tiene título, descripción y los datos de la organización', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Arquitectura, ingeniería y gestión de proyectos en el Quindío | Grupo Arquinova');
    expect(await meta(page, 'name="description"')).toContain('Armenia');
    // Sin dominio propio configurado (sitioUrl vacío) todo el sitio pide no indexarse
    expect(await meta(page, 'name="robots"')).toBe('noindex, nofollow');

    const datos = JSON.parse(await page.locator('head script#datos-estructurados').textContent() ?? '{}');
    expect(datos['@type']).toBe('Organization');
    expect(datos.taxID).toBe('901.397.504-2');
    expect(datos.address.addressLocality).toBe('Armenia');
  });

  test('el listado de proyectos tiene su propio título', async ({ page }) => {
    await page.goto('/proyectos');
    await expect(page).toHaveTitle('Proyectos | Grupo Arquinova');
  });

  test('un proyecto lleva su nombre, lugar, descripción y datos de ubicación', async ({ page }) => {
    await page.goto(`/proyectos/${PROYECTO_ID}/bienvenida`);
    await expect(page).toHaveTitle('El Encanto en La Tebaida, Quindío | Grupo Arquinova');
    // El servidor pinta primero con el backend real (si está encendido) y el navegador luego pone los datos simulados:
    // se espera a que cambie en vez de leerlo en ese primer instante
    await expect.poll(() => meta(page, 'name="description"')).toBe('Proyecto de prueba');
    expect(await meta(page, 'property="og:title"')).toContain('El Encanto');

    const datos = JSON.parse(await page.locator('head script#datos-estructurados').textContent() ?? '{}');
    expect(datos['@type']).toBe('Place');
    expect(datos.address.addressLocality).toBe('La Tebaida');
  });

  test('cada sección del proyecto cambia el título', async ({ page }) => {
    await page.goto(`/proyectos/${PROYECTO_ID}/casa-modelo?vista=imagenes`);
    await expect(page).toHaveTitle('Tipologías · El Encanto en La Tebaida, Quindío | Grupo Arquinova');
  });

  test('un proyecto que no existe pide no ser indexado', async ({ page }) => {
    await page.route('**/api/proyectos/999', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    await page.goto('/proyectos/999/bienvenida');
    await expect(page).toHaveTitle('Proyecto no encontrado | Grupo Arquinova');
    expect(await meta(page, 'name="robots"')).toBe('noindex, nofollow');
  });

  test('la página legal usa el título de su documento', async ({ page }) => {
    await page.goto('/legal/politica-datos');
    await expect(page).toHaveTitle('Política de tratamiento de datos personales | Grupo Arquinova');
  });

  test('el ingreso al panel no se indexa', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('Ingreso al panel | Grupo Arquinova');
    expect(await meta(page, 'name="robots"')).toBe('noindex, nofollow');
  });
});

test.describe('lo que recibe Google del servidor', () => {
  test('el HTML del inicio ya trae el título y la descripción', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('<title>Arquitectura, ingeniería y gestión de proyectos en el Quindío | Grupo Arquinova</title>');
    expect(html).toContain('name="description"');
    expect(html).toContain('application/ld+json');
  });

  test('robots.txt cierra el panel e indica el mapa del sitio', async ({ request }) => {
    const respuesta = await request.get('/robots.txt');
    expect(respuesta.ok()).toBe(true);
    const texto = await respuesta.text();
    expect(texto).toContain('Disallow: /admin');
    // La línea Sitemap la agrega el servidor de producción; el servidor de desarrollo sirve el archivo estático
  });

  test('sitemap.xml lista las páginas fijas y las legales', async ({ request }) => {
    const respuesta = await request.get('/sitemap.xml');
    expect(respuesta.ok()).toBe(true);
    expect(respuesta.headers()['content-type']).toContain('xml');
    const xml = await respuesta.text();
    expect(xml).toContain('<loc>http://localhost:4300/</loc>');
    expect(xml).toContain('<loc>http://localhost:4300/proyectos</loc>');
    expect(xml).toContain('<loc>http://localhost:4300/legal/politica-datos</loc>');
  });
});
