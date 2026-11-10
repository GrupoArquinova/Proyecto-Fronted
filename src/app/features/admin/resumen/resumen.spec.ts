import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { Resumen } from './resumen';

const API = environment.apiUrl;

const dashboard = {
  totalProyectos: 4, proyectosPublicados: 2, totalLotes: 6, lotesDisponibles: 3, lotesReservados: 2, lotesVendidos: 1,
  totalSolicitudes: 6, solicitudesNuevas: 2, distribucionLotesPorEstado: {}, distribucionSolicitudesPorEstado: {},
};

const lote = (proyecto: string, estado: string, activo = true) => ({ proyectoNombre: proyecto, estadoComercial: estado, activo });

const solicitud = (n: number, estado: string) => ({ clienteNombre: `Cliente ${n}`, proyectoNombre: 'El Encanto', estadoNombre: estado, creadoEn: '2026-10-14T09:00:00' });

describe('Resumen', () => {
  let fixture: ComponentFixture<Resumen>;
  let http: HttpTestingController;

  function crear(token: string | null = 'jwt', plataforma = 'browser') {
    localStorage.clear();
    if (token) localStorage.setItem('jwt_token', token);
    TestBed.configureTestingModule({
      imports: [Resumen],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: plataforma }],
    });
    fixture = TestBed.createComponent(Resumen);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  /** Responde las cuatro consultas de la pantalla; cada una puede fallar con `null`. */
  function responder(datos: { dashboard?: unknown; lotes?: unknown[]; solicitudes?: unknown[]; proyectos?: unknown[] }) {
    const fallar = { status: 500, statusText: 'Error' };
    const r = (url: string, cuerpo: unknown) => {
      const p = http.expectOne(x => x.url === `${API}${url}`);
      if (cuerpo === null) p.flush(null, fallar); else p.flush(cuerpo as object);
    };
    r('/reportes/dashboard', datos.dashboard === undefined ? dashboard : datos.dashboard);
    r('/reportes/lotes', datos.lotes ?? []);
    r('/reportes/solicitudes', datos.solicitudes ?? []);
    r('/proyectos', datos.proyectos ?? []);
    fixture.detectChanges();
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('con sesión pide los datos y muestra los indicadores de lotes y solicitudes', () => {
    const { componente, el } = crear();
    expect(componente.cargando).toBe(true);

    responder({});

    expect([componente.disponibles, componente.reservados, componente.vendidos, componente.solicitudesNuevas]).toEqual([3, 2, 1, 2]);
    expect(componente.cargando).toBe(false);
    expect(el.querySelector('h1')?.textContent).toContain('Resumen General');
    expect(el.querySelectorAll('.stat-numero')[0].textContent).toContain('3');
  });

  it('agrupa los lotes por proyecto: cuenta como ocupados los que no están disponibles y se salta los inactivos', () => {
    const { componente, el } = crear();

    responder({
      lotes: [lote('Los Andes', 'DISPONIBLE'), lote('Los Andes', 'VENDIDO'), lote('Los Andes', 'reservado'), lote('Los Andes', 'VENDIDO', false), lote('Solara', 'DISPONIBLE')],
    });

    expect(componente.estadoProyectos.map(p => [p.nombre, p.ocupados, p.total])).toEqual([['Los Andes', 2, 3], ['Solara', 0, 1]]);
    expect(componente.estadoProyectos[0].porcentaje).toBeCloseTo(66.67, 1);
    expect(el.querySelectorAll('.proyecto-item').length).toBe(2);
    expect(el.querySelector('.proyecto-conteo')?.textContent).toContain('2/3');
  });

  it('muestra solo las últimas 4 solicitudes, con la clase de color de su estado', () => {
    const { componente, el } = crear();

    responder({ solicitudes: [1, 2, 3, 4, 5].map(n => solicitud(n, n === 1 ? 'NUEVO' : 'ATENDIDA')) });

    expect(componente.ultimasSolicitudes.length).toBe(4);
    expect(el.querySelectorAll('.solicitud-item').length).toBe(4);
    expect(el.querySelector('.solicitud-detalle')?.textContent).toContain('El Encanto · 2026-10-14');
    expect(el.querySelector('.badge')?.classList.contains('badge-nuevo')).toBe(true);
  });

  it('el color del estado: nuevo, atendido, descartado y cualquier otro', () => {
    const { componente } = crear();
    responder({});

    expect(componente.claseEstado('NUEVA')).toBe('badge-nuevo');
    expect(componente.claseEstado('atendido')).toBe('badge-atendido');
    expect(componente.claseEstado('DESCARTADA')).toBe('badge-descartado');
    expect(componente.claseEstado('EN_GESTION')).toBe('badge-nuevo');
    expect(componente.claseEstado(undefined as never)).toBe('badge-nuevo');
  });

  it('la tabla de proyectos muestra imagen o marcador, etapa, enlace, lanzamiento y visibilidad', () => {
    const { el } = crear();

    responder({
      proyectos: [
        { id: 1, nombre: 'Los Andes', slug: 'los-andes', estadoProyecto: 'EN_CONSTRUCCION', publicado: true, fechaLanzamiento: '2026-10-31', imagenUrl: 'https://img.test/a.jpg' },
        { id: 2, nombre: 'Sin datos', estadoProyecto: 'EN_DISENO', publicado: false },
      ],
    });

    const filas = el.querySelectorAll('.executive-table tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].querySelector('img.td-thumb')).not.toBeNull();
    expect(filas[0].textContent).toContain('En construcción');
    expect(filas[0].textContent).toContain('los-andes');
    expect(filas[0].textContent).toContain('Publicado');
    expect(filas[1].querySelector('.td-thumb-sin-imagen')).not.toBeNull();
    expect(filas[1].textContent).toContain('N/A');
    expect(filas[1].textContent).toContain('Sin definir');
    expect(filas[1].textContent).toContain('Borrador');
  });

  it('sin datos muestra los mensajes de "no hay"', () => {
    const { el } = crear();

    responder({});

    expect(el.textContent).toContain('No hay proyectos con lotes registrados.');
    expect(el.textContent).toContain('No hay solicitudes registradas.');
    expect(el.querySelector('.empty-table-msg')).not.toBeNull();
  });

  it('si falla el resumen general muestra el aviso arriba y deja de cargar', () => {
    const { componente, el } = crear();

    responder({ dashboard: null, lotes: undefined, solicitudes: undefined, proyectos: undefined });
    expect(componente.error).toBe('No se pudo cargar el resumen general.');
    expect(componente.cargando).toBe(false);
    expect(el.querySelector('.alerta-error')?.textContent).toContain('No se pudo cargar el resumen general.');
  });

  it('cada consulta que falla deja su propio mensaje', () => {
    const fallar = { status: 500, statusText: 'Error' };
    const { componente } = crear();

    http.expectOne(x => x.url === `${API}/reportes/dashboard`).flush(dashboard);
    http.expectOne(x => x.url === `${API}/reportes/lotes`).flush(null, fallar);
    http.expectOne(x => x.url === `${API}/reportes/solicitudes`).flush([]);
    http.expectOne(x => x.url === `${API}/proyectos`).flush(null, fallar);

    expect(componente.error).toBe('No se pudo cargar el estado de los proyectos.');
    expect(componente.cargando).toBe(false);
  });

  it('si falla solo la consulta de solicitudes lo dice', () => {
    const fallar = { status: 500, statusText: 'Error' };
    const { componente } = crear();

    http.expectOne(x => x.url === `${API}/reportes/dashboard`).flush(dashboard);
    http.expectOne(x => x.url === `${API}/reportes/lotes`).flush([]);
    http.expectOne(x => x.url === `${API}/reportes/solicitudes`).flush(null, fallar);
    http.expectOne(x => x.url === `${API}/proyectos`).flush([]);

    expect(componente.error).toBe('No se pudieron cargar las últimas solicitudes.');
  });

  it('sin sesión (sin token) no consulta nada', () => {
    const { componente } = crear(null);

    http.expectNone(() => true);
    expect(componente.cargando).toBe(false);
  });

  it('en el servidor (sin navegador) no consulta nada', () => {
    const { componente } = crear('jwt', 'server');

    http.expectNone(() => true);
    expect(componente.cargando).toBe(false);
  });
});
