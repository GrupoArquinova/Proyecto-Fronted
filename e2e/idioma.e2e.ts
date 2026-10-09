import { expect, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';

test.beforeEach(async ({ page }) => {
  await simularBackend(page);
});

test.describe('idioma del sitio', () => {
  test('con un navegador en español el inicio sale en español y el selector lo muestra', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('link', { name: 'Servicios' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('al pasar a inglés cambian el texto, el título de la pestaña y el atributo lang, y se recuerda', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('header nav a.nav-item').first()).toHaveText('Home');
    await expect(page.locator('h1.hero-title')).toContainText('Studies, designs and management');
    await expect(page).toHaveTitle('Architecture, engineering and project management in Quindío | Grupo Arquinova');
    await expect(page.getByRole('button', { name: 'Send request' })).toBeVisible();

    // Al volver a abrir el sitio, queda en inglés
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('header nav a.nav-item').first()).toHaveText('Home');
  });

  test('el servicio de interés se envía en español aunque la persona vea el sitio en inglés', async ({ page }) => {
    let enviado: Record<string, unknown> | null = null;
    await page.route('**/api/solicitudes-contacto/publico', route => {
      enviado = route.request().postDataJSON();
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 1, estadoNombre: 'NUEVO' }) });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: 'Send request' })).toBeVisible();

    await page.locator('#contacto').getByPlaceholder('John Smith').fill('Ana');
    await page.locator('#contacto').getByPlaceholder('email@example.com').fill('ana@test.com');
    await page.locator('#contacto select[formControlName="servicioInteres"]').selectOption({ label: 'Feasibility studies' });
    await page.locator('#contacto input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.getByText('Request sent successfully')).toBeVisible();
    expect(enviado).not.toBeNull();
    expect((enviado as unknown as Record<string, unknown>)['servicioInteres']).toBe('Estudios de viabilidad');
    // Y viaja el idioma del sitio, para responderle (y confirmarle por correo) en inglés
    expect((enviado as unknown as Record<string, unknown>)['idioma']).toBe('en');
  });

  test('al pasar a inglés, el micrositio del proyecto usa los textos en inglés de la base y deja el español donde no los hay', async ({ page }) => {
    await page.goto('/proyectos/6/casa-modelo?vista=imagenes');
    await page.getByRole('button', { name: 'English' }).click();

    const menu = page.locator('aside.menu');
    await expect(menu.getByText('House types', { exact: true })).toBeVisible();
    await expect(menu.getByText('Amenities', { exact: true })).toBeVisible();
    // Descripción de la tipología: viene de la base, ya en inglés
    await expect(page.locator('.descripcion')).toHaveText('Two-storey villa');
    // Título de la pestaña
    await expect(page).toHaveTitle(/House types · El Encanto in La Tebaida, Quindío \| Grupo Arquinova/);

    // Al volver a español regresa el texto original
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.locator('.descripcion')).toHaveText('Villa de dos plantas');
  });

  test('recorrido por todas las páginas públicas en inglés: no queda ninguna palabra de la interfaz en español', async ({ page }) => {
    // Palabras de la interfaz que no deben aparecer cuando el sitio está en inglés (no se incluyen nombres propios ni datos de la base)
    const prohibidas = ['Amenidades', 'Tipologías', 'Ubicación', 'Contacto', 'Contáctanos', 'Enviar', 'Inicio', 'Servicios', 'Cargando',
      'Lotes', 'Disponibilidad', 'Bienvenida', 'Galería', 'Imágenes', 'Planos', 'Mensaje', 'Teléfono', 'Correo', 'Volver', 'Proyectos',
      'Quiénes', 'Todos los', 'Términos', 'Política', 'Aviso'];

    const rutas = ['/', '/proyectos', '/legal/politica-datos', '/legal/terminos', '/legal/cookies', '/legal/aviso-privacidad', '/legal/aviso-legal',
      '/proyectos/6/bienvenida', '/proyectos/6/ubicacion', '/proyectos/6/zonas-comunes', '/proyectos/6/zonas-comunes?vista=galeria',
      '/proyectos/6/casa-modelo?vista=imagenes', '/proyectos/6/casa-modelo?vista=planos', '/proyectos/6/contacto'];

    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const hallazgos: string[] = [];
    for (const ruta of rutas) {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await page.waitForTimeout(700);
      const texto = await page.evaluate(() => document.body.innerText);
      const atributos = await page.evaluate(() => [...document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')]
        .map(e => ['aria-label', 'title', 'placeholder', 'alt'].map(a => e.getAttribute(a) ?? '').join(' ')).join(' | '));
      for (const palabra of prohibidas) {
        const re = new RegExp(String.raw`(^|[^\p{L}])${palabra}([^\p{L}]|$)`, 'u');
        if (re.test(texto)) hallazgos.push(`${ruta}: texto visible con "${palabra}"`);
        if (re.test(atributos)) hallazgos.push(`${ruta}: atributo con "${palabra}"`);
      }
    }
    expect(hallazgos, 'Textos de la interfaz que siguen en español').toEqual([]);
  });
});
