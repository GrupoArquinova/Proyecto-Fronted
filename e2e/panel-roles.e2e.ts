import { expect, Page, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';
import { iniciarSesion } from './sesion';

const json = (cuerpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const METRICAS = {
  periodo: { desde: '2026-10-05', hasta: '2026-11-03' },
  solicitudes: {
    total: 12,
    porSemana: [{ semana: '2026-W41', inicio: '2026-10-05', total: 5 }, { semana: '2026-W42', inicio: '2026-10-12', total: 7 }],
    porProyecto: [{ proyectoId: 6, proyecto: 'El Encanto', total: 9 }],
    porEstado: [{ estado: 'NUEVO', total: 12 }]
  },
  lotes: {
    porEstado: [{ estado: 'DISPONIBLE', total: 8 }],
    porProyecto: [{ proyectoId: 6, proyecto: 'El Encanto', disponibles: 8, reservados: 2, vendidos: 4, total: 14 }]
  },
  analitica: {
    visitasPorProyecto: [{ proyectoId: 6, proyecto: 'El Encanto', vistas: 120 }],
    eventosPorTipo: [{ tipo: 'VISTA_PROYECTO', total: 120 }],
    visitasPorDia: [{ fecha: '2026-10-10', total: 30 }, { fecha: '2026-10-12', total: 10 }],
    embudo: { vistasProyecto: 120, clicksWhatsapp: 40, formulariosEnviados: 12, descargasBrochure: 6 }
  },
  chat: {
    totalPreguntas: 15,
    temas: [{ tema: 'UBICACION', total: 9 }, { tema: 'PRECIOS', total: 6 }],
    recientes: [{ fecha: '2026-11-02T15:30:00', pregunta: '¿Dónde queda El Encanto?', tema: 'UBICACION' }]
  }
};

const REGISTROS = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1, usuarioId: 1, usuarioNombre: 'Ana Gómez', accion: i === 0 ? 'CREAR_USUARIO' : 'ACTUALIZAR_PROYECTO',
  entidad: i === 0 ? 'USUARIOS' : 'PROYECTOS', entidadId: 10 + i, descripcion: `Cambio número ${i + 1}`, creadoEn: '2026-11-02T15:30:00'
}));

async function prepararPanel(page: Page, ...roles: string[]) {
  // Lo que no se simula responde vacío; el sitio público usa los datos simulados
  await page.route('**/api/**', route => route.fulfill(json([])));
  await simularBackend(page);
  await page.route(/\/api\/admin\/metricas/, route => route.fulfill(json(METRICAS)));
  await page.route(/\/api\/admin\/auditoria\/filtros/, route => route.fulfill(json({ entidades: ['PROYECTOS', 'USUARIOS'], acciones: ['CREAR_USUARIO', 'ACTUALIZAR_PROYECTO'] })));
  await page.route(/\/api\/admin\/auditoria(\?.*)?$/, route => route.fulfill(json({ contenido: REGISTROS, pagina: 0, tamano: 25, totalElementos: 3, totalPaginas: 1 })));
  await page.route(/\/api\/roles$/, route => route.fulfill(json([
    { id: 21, nombre: 'ADMINISTRADOR', descripcion: 'Acceso total', activo: true },
    { id: 22, nombre: 'COMERCIAL', descripcion: null, activo: true },
    { id: 23, nombre: 'EDITOR', descripcion: null, activo: true }
  ])));
  await iniciarSesion(page, ...roles);
}

const menu = (page: Page) => page.locator('app-sidebar a.nav-item');

test.describe('roles en el panel', () => {
  test('el administrador ve todo el menú, incluidas Métricas e Historial, y arranca en el Resumen', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/resumen$/);
    await expect(page.locator('.usuario-rol')).toContainText('Admin');
    const textos = await menu(page).allTextContents();
    expect(textos.map(t => t.trim())).toEqual([
      'Resumen', 'Métricas', 'Proyectos', 'Etapas', 'Lotes', 'Amenidades', 'Tipologías', 'Multimedia', 'Ubicaciones',
      'Solicitudes', 'Contenido institucional', 'Usuarios', 'Historial de cambios', 'Reportes'
    ]);
  });

  test('el comercial arranca en Métricas, solo ve Métricas y Solicitudes, y no puede entrar a lo demás', async ({ page }) => {
    await prepararPanel(page, 'ROLE_COMERCIAL');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/metricas$/);
    await expect(page.locator('.usuario-rol')).toContainText('Comercial');
    expect((await menu(page).allTextContents()).map(t => t.trim())).toEqual(['Métricas', 'Solicitudes']);

    for (const ruta of ['proyectos', 'usuarios', 'historial', 'reportes', 'lotes']) {
      await page.goto(`/admin/${ruta}`);
      await expect(page).toHaveURL(/\/admin\/metricas$/);
    }
    await page.goto('/admin/solicitudes');
    await expect(page).toHaveURL(/\/admin\/solicitudes$/);
  });

  test('el editor arranca en Proyectos, solo ve el contenido, y no entra a solicitudes, usuarios, historial ni métricas', async ({ page }) => {
    await prepararPanel(page, 'ROLE_EDITOR');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/proyectos$/);
    await expect(page.locator('.usuario-rol')).toContainText('Editor');
    const textos = (await menu(page).allTextContents()).map(t => t.trim());
    expect(textos).toEqual(['Proyectos', 'Etapas', 'Lotes', 'Amenidades', 'Tipologías', 'Multimedia', 'Ubicaciones', 'Contenido institucional']);

    for (const ruta of ['solicitudes', 'usuarios', 'historial', 'metricas', 'reportes', 'resumen']) {
      await page.goto(`/admin/${ruta}`);
      await expect(page).toHaveURL(/\/admin\/proyectos$/);
    }
  });

  test('un 403 del servidor muestra "No tienes permiso para esta acción" sin cerrar la sesión', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.route(/\/api\/usuarios$/, route => route.fulfill(json([{ id: 9, rolId: 22, rolNombre: 'COMERCIAL', nombreCompleto: 'Luis Pérez', correo: 'luis@arquinova.co', activo: true }])));
    await page.route(/\/api\/usuarios\/9$/, route => route.fulfill(json({}, 403)));
    await page.goto('/admin/usuarios');
    await expect(page.getByRole('cell', { name: 'Luis Pérez' })).toBeVisible();
    await page.getByTitle('Eliminar').click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByText('No tienes permiso para esta acción.')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/usuarios$/);
  });

  test('el formulario de usuarios ofrece los roles que entrega el backend con una descripción', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.goto('/admin/usuarios');
    await page.getByRole('button', { name: '+ Nuevo usuario' }).click();
    const selector = page.getByLabel('Rol *');
    await expect(selector.locator('option')).toHaveText(['Administrador', 'Comercial', 'Editor de contenido']);
    await selector.selectOption({ label: 'Comercial' });
    await expect(page.locator('#usuarios-rol-ayuda')).toContainText('solicitudes');
  });
});

test.describe('métricas', () => {
  test('el administrador ve tarjetas, gráficas y las preguntas recientes del chat', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.goto('/admin/metricas');
    await expect(page.getByRole('heading', { name: 'Métricas', level: 1 })).toBeVisible();
    await expect(page.locator('[data-tarjeta="solicitudes"] .numero')).toHaveText('12');
    await expect(page.locator('[data-tarjeta="visitas"] .numero')).toHaveText('120');
    await expect(page.locator('[data-tarjeta="whatsapp"] .numero')).toHaveText('40');
    await expect(page.locator('[data-tarjeta="formularios"] .numero')).toHaveText('12');
    await expect(page.locator('[data-tarjeta="descargas"] .numero')).toHaveText('6');

    for (const titulo of ['Solicitudes por semana', 'Solicitudes por proyecto', 'Lotes por estado', 'Visitas por proyecto', 'Embudo de interés', 'Visitas por día', 'Temas más preguntados al asistente']) {
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    }
    await expect(page.locator('svg[role="img"]').first()).toHaveAttribute('aria-label', /Total: 12 solicitudes/);
    await expect(page.getByRole('heading', { name: 'Preguntas recientes del chat' })).toBeVisible();
    await expect(page.locator('.recientes')).toContainText('¿Dónde queda El Encanto?');
  });

  test('el comercial ve las métricas pero no las preguntas del chat', async ({ page }) => {
    await prepararPanel(page, 'ROLE_COMERCIAL');
    await page.goto('/admin/metricas');
    await expect(page.locator('[data-tarjeta="solicitudes"] .numero')).toHaveText('12');
    await expect(page.getByRole('heading', { name: 'Preguntas recientes del chat' })).toHaveCount(0);
  });

  test('el selector de período pide 7 días y el rango personalizado', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.goto('/admin/metricas');
    await expect(page.locator('.tarjetas')).toBeVisible();

    const pedido = page.waitForRequest(r => /\/api\/admin\/metricas/.test(r.url()) && r.url().includes('desde='));
    await page.getByRole('button', { name: '7 días' }).click();
    const url = new URL((await pedido).url());
    const dias = (new Date(url.searchParams.get('hasta')!).getTime() - new Date(url.searchParams.get('desde')!).getTime()) / 86_400_000;
    expect(dias).toBe(6);

    await page.getByRole('button', { name: 'Personalizado' }).click();
    await page.getByLabel('Desde').fill('2026-10-20');
    await page.getByLabel('Hasta').fill('2026-10-10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByRole('alert')).toContainText('posterior');
  });

  test('muestra el error y permite reintentar', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    let intentos = 0;
    await page.route(/\/api\/admin\/metricas/, route => (++intentos === 1 ? route.fulfill(json({}, 500)) : route.fulfill(json(METRICAS))));
    await page.goto('/admin/metricas');
    await expect(page.getByRole('alert')).toContainText('No se pudieron cargar las métricas');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('[data-tarjeta="solicitudes"] .numero')).toHaveText('12');
  });

  test('sin datos muestra estados vacíos', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.route(/\/api\/admin\/metricas/, route => route.fulfill(json({})));
    await page.goto('/admin/metricas');
    await expect(page.getByText('No hubo solicitudes en este período.').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NaN');
  });
});

test.describe('historial de cambios', () => {
  test('el administrador ve la tabla con acción, usuario, fecha y atajo', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.goto('/admin/historial');
    await expect(page.getByRole('heading', { name: 'Historial de cambios', level: 1 })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await expect(page.locator('tbody tr').first()).toContainText('Ana Gómez');
    await expect(page.locator('tbody .badge').first()).toHaveText('Crear usuario');
    await expect(page.locator('tbody a.atajo').first()).toHaveAttribute('href', '/admin/usuarios');
    await expect(page.locator('.paginacion')).toContainText('3 registros');
    await expect(page.getByLabel('Entidad').locator('option')).toHaveText(['Todas', 'PROYECTOS', 'USUARIOS']);
  });

  test('filtrar manda los filtros al servidor', async ({ page }) => {
    await prepararPanel(page, 'ROLE_ADMINISTRADOR');
    await page.goto('/admin/historial');
    await expect(page.locator('tbody tr')).toHaveCount(3);
    const pedido = page.waitForRequest(r => /\/api\/admin\/auditoria\?/.test(r.url()) && r.url().includes('entidad=USUARIOS'));
    await page.getByLabel('Entidad').selectOption('USUARIOS');
    await page.getByLabel('Texto').fill('lote');
    await page.getByRole('button', { name: 'Filtrar' }).click();
    const url = new URL((await pedido).url());
    expect(url.searchParams.get('texto')).toBe('lote');
    expect(url.searchParams.get('page')).toBe('0');
  });
});
