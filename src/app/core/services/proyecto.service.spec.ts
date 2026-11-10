import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProyectoService } from './proyecto.service';

describe('ProyectoService (catalogo publico)', () => {
  let servicio: ProyectoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ProyectoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function responder(proyectos: object[], lotes: object[] = [], ubicaciones: object[] | 'error' = []) {
    let resultado: Awaited<ReturnType<typeof leer>> | undefined;
    const leer = () => new Promise<import('../models/proyecto.models').CatalogoPublico>(ok => servicio.obtenerCatalogoPublico().subscribe(ok));
    const promesa = leer().then(r => (resultado = r));

    http.expectOne(r => r.url.endsWith('/proyectos')).flush(proyectos);
    http.expectOne(r => r.url.endsWith('/lotes/publicos')).flush(lotes);
    const peticionUbicaciones = http.expectOne(r => r.url.endsWith('/ubicaciones'));
    if (ubicaciones === 'error') peticionUbicaciones.flush('x', { status: 500, statusText: 'Error' });
    else peticionUbicaciones.flush(ubicaciones);
    return promesa.then(() => resultado!);
  }

  const proyecto = (id: number, extra: object = {}) => ({
    id, empresaId: 1, nombre: `Proyecto ${id}`, publicado: true, activo: true, estadoProyecto: 'EN_CONSTRUCCION', ...extra
  });

  it('muestra la etapa real del proyecto y no "EN VENTA" para todos', async () => {
    const catalogo = await responder([proyecto(1, { estadoProyecto: 'EN_TRAMITE' })]);
    expect(catalogo.proyectos[0].estado).toBe('En trámite');
  });

  it('el proyecto destacado va primero', async () => {
    const catalogo = await responder([proyecto(1), proyecto(2, { destacado: true }), proyecto(3)]);
    expect(catalogo.proyectos.map(p => p.id)).toEqual([2, 1, 3]);
  });

  it('toma municipio y lugar de la ubicacion del proyecto', async () => {
    const catalogo = await responder([proyecto(1)], [], [{ proyectoId: 1, ciudad: 'La Tebaida', departamento: 'Quindío' }]);
    expect(catalogo.proyectos[0].municipio).toBe('La Tebaida');
    expect(catalogo.proyectos[0].ubicacion).toBe('La Tebaida, Quindío');
  });

  it('si falla la consulta de ubicaciones el catalogo se muestra igual, sin municipio', async () => {
    const catalogo = await responder([proyecto(1)], [], 'error');
    expect(catalogo.proyectos).toHaveLength(1);
    expect(catalogo.proyectos[0].municipio).toBe('');
    expect(catalogo.proyectos[0].ubicacion).toBe('Colombia');
  });

  it('no inventa una descripcion cuando el proyecto no la tiene', async () => {
    const catalogo = await responder([proyecto(1)]);
    expect(catalogo.proyectos[0].descripcion).toBe('');
  });

  it('cuenta lotes y disponibles por proyecto', async () => {
    const lotes = [
      { id: 1, proyectoId: 1, estadoNombre: 'DISPONIBLE' },
      { id: 2, proyectoId: 1, estadoNombre: 'VENDIDO' },
      { id: 3, proyectoId: 2, estadoNombre: 'DISPONIBLE' }
    ];
    const catalogo = await responder([proyecto(1), proyecto(2)], lotes);
    expect(catalogo.proyectos.find(p => p.id === 1)).toMatchObject({ totalLotes: 2, lotesDisponibles: 1 });
    expect(catalogo.totalLotes).toBe(3);
  });
});
