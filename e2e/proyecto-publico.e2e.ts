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

test.describe('lotes con imagen 360°', () => {
  // Imagen equirectangular de prueba (2:1)
  const PANORAMA = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAACACAIAAABr1yBdAAABfUlEQVR4nO3TwQ2AMAwAsUZiGKZjJjalEogpzv6k+Ua9Oa97veYbHo6wQj/hWPP8K+QIgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpG1VigolRTNbOAAAAAElFTkSuQmCC', 'base64');
  const json = (cuerpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/lotes/publicos', route => route.fulfill(json([
      { id: 101, codigo: 'LT-101', nombre: 'Lote Esquinero 101', areaM2: 1200, proyectoId: PROYECTO_ID, etapaNombre: 'Etapa 1', estadoId: 1, estadoNombre: 'DISPONIBLE', activo: true, publicado: true },
      { id: 102, codigo: 'LT-102', nombre: 'Lote Medianero 102', areaM2: 1000, proyectoId: PROYECTO_ID, etapaNombre: 'Etapa 1', estadoId: 2, estadoNombre: 'RESERVADO', activo: true, publicado: true }
    ])));
    await page.route(/\/api\/multimedia\/lote\/101/, route => route.fulfill(json([
      { id: 1, loteId: 101, tipo: 'PANORAMICA_360', url: 'https://img.test/lote-101-360.png', publicado: true, activo: true, portada: false }
    ])));
    await page.route(/\/api\/multimedia\/lote\/102/, route => route.fulfill(json([])));
    await page.route('https://img.test/**', route => route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PANORAMA }));
  });

  /** Entra por el menú del micrositio a la sección Lotes (por defecto queda el primer lote, LT-101). */
  const irALotes = async (page: import('@playwright/test').Page) => {
    await page.goto(`${base}/bienvenida`);
    await page.locator('aside').getByRole('link', { name: 'Lotes', exact: true }).click();
    await expect(page.getByText('Lote seleccionado')).toBeVisible();
  };

  test('el lote con 360° tiene su botón, abre el recorrido y se cierra; el que no tiene, no', async ({ page }) => {
    await irALotes(page);
    const boton = page.getByRole('button', { name: 'Ver en 360°' });
    await expect(boton).toBeVisible();
    await expect(page.getByRole('link', { name: 'Solicitar información' })).toBeVisible();

    await boton.click();
    const dialogo = page.getByRole('dialog', { name: /LT-101/ });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('.psv-container')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialogo).toHaveCount(0);

    // Otro lote sin imagen 360°: el botón no aparece
    await page.locator('main').getByRole('link', { name: /LT-102/ }).click();
    await expect(page.locator('app-lote-tarjeta h3')).toHaveText('LT-102');
    await expect(page.getByRole('link', { name: 'Solicitar información' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver en 360°' })).toHaveCount(0);
  });

  test('entrar por la URL directa a Lotes y a Disponibilidad no redirige a Bienvenida', async ({ page }) => {
    await page.goto(`${base}/lotes`);
    await expect(page.getByText('Lote seleccionado')).toBeVisible();
    await expect(page).toHaveURL(/\/proyectos\/\d+\/lotes/);

    await page.goto(`${base}/disponibilidad`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL(/\/proyectos\/\d+\/disponibilidad/);
  });

  test('una sección sin contenido escrita a mano vuelve a Bienvenida', async ({ page }) => {
    await page.goto(`${base}/respaldo`);
    await expect(page).toHaveURL(/\/proyectos\/\d+\/bienvenida/);
  });

  test('en inglés el botón dice "View in 360°"', async ({ page }) => {
    await page.goto(`${base}/bienvenida`);
    await page.getByRole('button', { name: 'English' }).click();
    await page.locator('aside').getByRole('link', { name: 'Lots', exact: true }).click();
    await expect(page.getByRole('button', { name: 'View in 360°' })).toBeVisible();
  });
});

