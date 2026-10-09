import { expect, test } from '@playwright/test';
import { IMAGEN_PORTADA_JACUZZI, PROYECTO_ID, simularBackend } from './datos-simulados';

const base = `/proyectos/${PROYECTO_ID}`;

test.beforeEach(async ({ page }) => {
  await simularBackend(page);
});

test.describe('menú del proyecto', () => {
  test('usa los nombres Amenidades y Tipologías', async ({ page }) => {
    await page.goto(`${base}/bienvenida`);
    const menu = page.locator('nav, aside').first();
    await expect(menu.getByText('Amenidades', { exact: true })).toBeVisible();
    await expect(menu.getByText('Tipologías', { exact: true })).toBeVisible();
    await expect(page.getByText('Casa Modelo', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Zonas Comunes', { exact: true })).toHaveCount(0);
  });
});

test.describe('tipologías', () => {
  test('muestra las tres villas y sus datos', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=imagenes`);
    const selector = page.getByRole('group', { name: 'Elegir tipología' });
    await expect(selector.getByRole('button')).toHaveText(['Villa Samán', 'Villa Guayacán', 'Villa Colibrí']);
    await expect(page.getByRole('heading', { name: 'Villa Samán' })).toBeVisible();
    await expect(page.getByText('293 m²')).toBeVisible();

    await selector.getByRole('button', { name: 'Villa Guayacán' }).click();
    await expect(page.getByRole('heading', { name: 'Villa Guayacán' })).toBeVisible();
    await expect(page.getByText('173 m²')).toBeVisible();
  });

  test('los planos se pasan con la flecha y con clic a un lado de la imagen', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=planos`);
    const imagen = page.locator('app-carrusel-laminas .imagen img');
    await expect(imagen).toHaveAttribute('src', /recurso-103/);

    await page.getByRole('button', { name: 'Imagen siguiente' }).click();
    await expect(imagen).toHaveAttribute('src', /recurso-104/);

    // Clic en la mitad izquierda de la imagen: vuelve al plano anterior
    const caja = (await page.locator('app-carrusel-laminas .imagen').boundingBox())!;
    await page.mouse.click(caja.x + caja.width * 0.2, caja.y + caja.height * 0.4);
    await expect(imagen).toHaveAttribute('src', /recurso-103/);
  });

  test('la pista de la mano se quita cuando el cliente toca la imagen', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=imagenes`);
    const pista = page.locator('app-carrusel-laminas .pista');
    await expect(pista).not.toHaveClass(/oculta/);

    await page.getByRole('button', { name: 'Imagen siguiente' }).click();
    await expect(pista).toHaveClass(/oculta/);
  });

  test('el botón de WhatsApp abre el chat con el mensaje de la villa que se está viendo', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=imagenes`);
    const boton = page.getByRole('link', { name: /Consultar por/ });

    await expect(boton).toHaveText(/Consultar por Villa Samán/);
    const enlace = await boton.getAttribute('href');
    expect(enlace).toContain('https://wa.me/573168653715?text=');
    expect(decodeURIComponent(enlace!.split('?text=')[1]))
      .toBe('Hola, estoy interesado en la tipología Villa Samán de El Encanto (293 m², 3 habitaciones, 4 baños). ¿Me pueden dar más información sobre esta villa?');

    await page.getByRole('group', { name: 'Elegir tipología' }).getByRole('button', { name: 'Villa Colibrí' }).click();
    await expect(boton).toHaveText(/Consultar por Villa Colibrí/);
    expect(decodeURIComponent((await boton.getAttribute('href'))!.split('?text=')[1])).toContain('Villa Colibrí de El Encanto (192 m², 4 habitaciones, 5 baños)');
  });

  test('si la persona esconde la tira de imágenes, no vuelve a salir sola al cambiar de imagen', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=imagenes`);
    const tira = page.getByRole('list', { name: 'Elegir imagen' });
    await expect(tira).toBeVisible();

    await page.getByRole('button', { name: 'Ocultar imágenes' }).click();
    await expect(tira).toHaveCount(0);

    await page.getByRole('button', { name: 'Imagen siguiente' }).click();
    await page.getByRole('button', { name: 'Imagen anterior' }).click();
    await page.waitForTimeout(500);
    await expect(tira).toHaveCount(0);

    // Solo vuelve cuando la persona pulsa la flecha
    await page.getByRole('button', { name: 'Ver imágenes' }).click();
    await expect(tira).toBeVisible();
  });

  test('el botón de ampliar entra y sale de la pantalla completa', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=planos`);
    const carrusel = page.locator('app-carrusel-laminas');

    await carrusel.getByRole('button', { name: 'Ver la imagen en pantalla completa' }).click();
    await expect(carrusel).toHaveClass(/ampliada/);

    await carrusel.getByRole('button', { name: 'Salir de pantalla completa' }).click();
    await expect(carrusel).not.toHaveClass(/ampliada/);
  });

  test('una tipología sin imágenes no ofrece la vista Imágenes', async ({ page }) => {
    await page.goto(`${base}/casa-modelo?vista=imagenes`);
    await page.getByRole('group', { name: 'Elegir tipología' }).getByRole('button', { name: 'Villa Colibrí' }).click();
    await expect(page.locator('app-carrusel-laminas')).toHaveCount(0);
  });
});

test.describe('amenidades', () => {
  test('la portada usa la imagen principal subida desde Multimedia', async ({ page }) => {
    await page.goto(`${base}/zonas-comunes`);
    await expect(page.getByRole('heading', { name: 'Amenidades', level: 2 })).toBeVisible();

    await page.getByRole('button', { name: /Jacuzzi/ }).click();
    // El carrusel de la zona empieza por la imagen de Multimedia y sigue con la galería
    const imagen = page.locator('app-carrusel-laminas .imagen img');
    await expect(imagen).toHaveAttribute('src', IMAGEN_PORTADA_JACUZZI);
  });
});
