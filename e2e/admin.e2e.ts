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

  // Las pantallas del panel reciben sus datos DESPUÉS de pintarse (la API responde con retraso): si la detección de cambios
  // las deja congeladas, se quedan en "Cargando..." para siempre. Estas pruebas simulan ese retraso.
  test('la lista de proyectos del panel muestra los datos que llegan de la API (no se queda en "Cargando")', async ({ page }) => {
    await page.route(/\/api\/proyectos(\?.*)?$/, async route => {
      await new Promise(r => setTimeout(r, 400));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 77, empresaId: 1, nombre: 'Proyecto de Prueba del Panel', slug: 'proyecto-de-prueba-del-panel', estadoProyecto: 'EN_DISENO',
          tipoRegistro: 'OFERTA_COMERCIAL', destacado: false, publicado: true, activo: true }
      ]) });
    });
    await page.goto('/admin/proyectos');

    await expect(page.getByText('Proyecto de Prueba del Panel')).toBeVisible();
    await expect(page.getByText('Cargando proyectos...')).toHaveCount(0);
  });

  test('la lista de solicitudes del panel deja de decir "Cargando" cuando la API responde', async ({ page }) => {
    await page.route(/\/api\/solicitudes-contacto$/, async route => {
      await new Promise(r => setTimeout(r, 400));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto('/admin/solicitudes');

    await expect(page.getByText('Cargando solicitudes...')).toHaveCount(0);
  });

  test('eliminar un administrador pide confirmación con el diálogo de la página, no con el del navegador', async ({ page }) => {
    let dialogoNativo = false;
    page.on('dialog', async d => { dialogoNativo = true; await d.dismiss(); });
    let borrado = false;
    await page.route(/\/api\/usuarios(\/\d+)?$/, async route => {
      const peticion = route.request();
      if (peticion.method() === 'DELETE') {
        borrado = true;
        return route.fulfill({ status: 204, body: '' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 5, nombreCompleto: 'Admin de Prueba', correo: 'prueba@arquinova.com', activo: true }
      ]) });
    });
    await page.goto('/admin/usuarios');
    await expect(page.getByText('Admin de Prueba')).toBeVisible();

    // Cancelar: no se borra nada
    await page.locator('.btn-action.delete').first().click();
    const dialogo = page.getByRole('alertdialog');
    await expect(dialogo).toContainText('Eliminar administrador');
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toHaveCount(0);
    expect(borrado).toBe(false);

    // Confirmar: ahora sí se borra
    await page.locator('.btn-action.delete').first().click();
    await Promise.all([
      page.waitForRequest(r => r.method() === 'DELETE' && /\/usuarios\/5$/.test(r.url())),
      page.getByRole('alertdialog').getByRole('button', { name: 'Sí, eliminar' }).click()
    ]);
    expect(dialogoNativo).toBe(false);
  });

  test('eliminar una amenidad usa el mismo diálogo de confirmación que el resto del panel', async ({ page }) => {
    let borrada = false;
    await page.route(/\/api\/proyectos(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 6, empresaId: 1, nombre: 'Proyecto de Prueba', slug: 'proyecto-de-prueba', estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', destacado: false, publicado: true, activo: true }
    ]) }));
    await page.route(/\/api\/zonas-comunes\/12$/, route => {
      borrada = true;
      return route.fulfill({ status: 204, body: '' });
    });
    await page.route(/\/api\/zonas-comunes\/proyecto\/\d+$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 12, proyectoId: 6, nombre: 'Jacuzzi de Prueba', descripcion: 'Zona de prueba', publicado: true, activo: true, imagenes: [] }
    ]) }));
    await page.goto('/admin/zonas-comunes');
    await expect(page.getByText('Jacuzzi de Prueba').first()).toBeVisible();

    await page.locator('.btn-icon.delete').first().click();
    const dialogo = page.getByRole('alertdialog');
    await expect(dialogo).toContainText('Eliminar amenidad');
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toHaveCount(0);
    expect(borrada).toBe(false);

    await page.locator('.btn-icon.delete').first().click();
    await Promise.all([
      page.waitForRequest(r => r.method() === 'DELETE' && /\/zonas-comunes\/12$/.test(r.url())),
      page.getByRole('alertdialog').getByRole('button', { name: 'Sí, eliminar' }).click()
    ]);
  });

  test('reportes: se ven en tablas, se filtran y el Excel y el PDF salen con los mismos filtros', async ({ page }) => {
    const json = (cuerpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
    await page.route(/\/api\/proyectos(\?.*)?$/, route => route.fulfill(json([
      { id: 1, empresaId: 1, nombre: 'Condominio Los Andes', slug: 'los-andes', estadoProyecto: 'EN_CONSTRUCCION', tipoRegistro: 'OFERTA_COMERCIAL', publicado: true, activo: true },
      { id: 2, empresaId: 1, nombre: 'Solara Campestre', slug: 'solara', estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', publicado: true, activo: true }
    ])));
    await page.route(/\/api\/reportes\/dashboard$/, route => route.fulfill(json({
      totalProyectos: 2, proyectosPublicados: 2, totalLotes: 3, lotesDisponibles: 2, lotesReservados: 1, lotesVendidos: 0,
      totalSolicitudes: 1, solicitudesNuevas: 1, distribucionLotesPorEstado: {}, distribucionSolicitudesPorEstado: { NUEVO: 1 }
    })));
    await page.route(/\/api\/reportes\/lotes(\?.*)?$/, route => {
      const soloUno = new URL(route.request().url()).searchParams.get('proyectoId') === '1';
      const lotes = [
        { id: 1, proyectoNombre: 'Condominio Los Andes', etapaNombre: 'Etapa 1', codigo: 'LT-101', loteNombre: 'Lote 101', areaM2: 1200, estadoComercial: 'DISPONIBLE', publicado: true, activo: true, creadoEn: '2026-10-14T09:00:00' },
        { id: 2, proyectoNombre: 'Condominio Los Andes', etapaNombre: 'Etapa 1', codigo: 'LT-102', loteNombre: 'Lote 102', areaM2: 1000, estadoComercial: 'RESERVADO', publicado: true, activo: true, creadoEn: '2026-10-14T09:00:00' },
        { id: 3, proyectoNombre: 'Solara Campestre', etapaNombre: 'Etapa 1', codigo: 'LT-0101', loteNombre: '', areaM2: 500, estadoComercial: 'DISPONIBLE', publicado: true, activo: true, creadoEn: '2026-10-05T09:00:00' }
      ];
      return route.fulfill(json(soloUno ? lotes.slice(0, 2) : lotes));
    });
    await page.route(/\/api\/reportes\/estados-comerciales(\?.*)?$/, route => route.fulfill(json([
      { proyectoId: 1, proyectoNombre: 'Condominio Los Andes', estadoNombre: 'DISPONIBLE', cantidadLotes: 1, porcentaje: 50 },
      { proyectoId: 1, proyectoNombre: 'Condominio Los Andes', estadoNombre: 'RESERVADO', cantidadLotes: 1, porcentaje: 50 }
    ])));

    await page.goto('/admin/reportes');
    const filas = page.locator('.tabla-reporte tbody tr');
    await expect(filas).toHaveCount(3);
    await expect(page.locator('.conteo')).toContainText('3 registros');
    await expect(filas.first()).toContainText('LT-101');
    await expect(filas.first()).toContainText('Disponible');

    // Filtrar por proyecto pide el reporte filtrado
    await Promise.all([
      page.waitForRequest(r => /\/reportes\/lotes/.test(r.url()) && new URL(r.url()).searchParams.get('proyectoId') === '1'),
      page.locator('.filtros').getByLabel('Proyecto').selectOption({ label: 'Condominio Los Andes' })
    ]);
    await expect(filas).toHaveCount(2);

    // Otra pestaña: tabla con barras de porcentaje
    await page.getByRole('tab', { name: 'Estados comerciales' }).click();
    await expect(page.locator('.tabla-reporte tbody tr')).toHaveCount(2);
    await expect(page.locator('.celda-barra').first()).toContainText('50,0 %');
    await page.getByRole('tab', { name: 'Lotes' }).click();

    // Exportar: mismos filtros que en pantalla
    await page.route(/\/api\/documentos\/(excel|pdf)\/lotes/, route => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: 'archivo' }));
    const [excel] = await Promise.all([
      page.waitForRequest(r => /\/documentos\/excel\/lotes/.test(r.url())),
      page.getByRole('button', { name: 'Descargar Excel' }).click()
    ]);
    expect(new URL(excel.url()).searchParams.get('proyectoId')).toBe('1');
    const [pdf] = await Promise.all([
      page.waitForRequest(r => /\/documentos\/pdf\/lotes/.test(r.url())),
      page.getByRole('button', { name: 'Descargar PDF' }).click()
    ]);
    expect(new URL(pdf.url()).searchParams.get('proyectoId')).toBe('1');
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
