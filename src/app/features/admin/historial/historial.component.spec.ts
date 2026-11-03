import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { HistorialComponent } from './historial.component';
import { environment } from '../../../../environments/environment';

const URL = `${environment.apiUrl}/admin/auditoria`;
const URL_FILTROS = `${URL}/filtros`;
const URL_USUARIOS = `${environment.apiUrl}/usuarios`;

const registro = (id: number, extra: Record<string, unknown> = {}) => ({
  id, usuarioId: 5, usuarioNombre: 'Ana Gómez', accion: 'CREAR_USUARIO', entidad: 'USUARIOS', entidadId: id,
  descripcion: 'Creación de un usuario', ip: '10.0.0.1', userAgent: 'x', creadoEn: '2026-10-05T15:30:00', ...extra
});
const pagina = (contenido: unknown[], extra: Record<string, unknown> = {}) =>
  ({ contenido, pagina: 0, tamano: 25, totalElementos: contenido.length, totalPaginas: 1, ...extra });

describe('HistorialComponent', () => {
  let http: HttpTestingController;

  afterEach(() => http.verify());

  function crear() {
    TestBed.configureTestingModule({ imports: [HistorialComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HistorialComponent);
    fixture.detectChanges();
    // Los selectores se llenan con la lista de usuarios y con los filtros del backend
    http.expectOne(URL_USUARIOS).flush([{ id: 5, rolId: 1, nombreCompleto: 'Ana Gómez', correo: 'a@a.co', activo: true }, { rolId: 1, nombreCompleto: 'Sin id', correo: 's@a.co', activo: true }]);
    http.expectOne(URL_FILTROS).flush({ entidades: ['PROYECTOS', 'USUARIOS'], acciones: ['CREAR_USUARIO', 'ELIMINAR_PROYECTO'] });
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }
  const principal = () => http.expectOne((r) => r.url === URL);
  const responder = (fixture: { detectChanges(): void }, cuerpo: object) => {
    principal().flush(cuerpo);
    fixture.detectChanges();
  };

  it('pide la primera página de 25 y muestra "Cargando" mientras llega', () => {
    const { el } = crear();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Cargando historial');
    const req = principal();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('25');
    req.flush(pagina([]));
  });

  it('los selectores ofrecen los usuarios, entidades y acciones del backend', () => {
    const { fixture, el } = crear();
    responder(fixture, pagina([]));
    const opciones = (id: string) => Array.from(el.querySelectorAll(`#${id} option`)).map((o) => o.textContent?.trim());
    expect(opciones('hist-usuario')).toEqual(['Todos', 'Ana Gómez']);
    expect(opciones('hist-entidad')).toEqual(['Todas', 'PROYECTOS', 'USUARIOS']);
    expect(opciones('hist-accion')).toEqual(['Todas', 'CREAR_USUARIO', 'ELIMINAR_PROYECTO']);
  });

  it('si los selectores no cargan, la pantalla sigue funcionando', () => {
    TestBed.configureTestingModule({ imports: [HistorialComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HistorialComponent);
    fixture.detectChanges();
    http.expectOne(URL_USUARIOS).flush(null, { status: 500, statusText: 'Error' });
    http.expectOne(URL_FILTROS).flush(null, { status: 500, statusText: 'Error' });
    responder(fixture, pagina([registro(1)]));
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('muestra una fila por registro con fecha local, usuario, distintivo de acción, entidad y descripción', () => {
    const { fixture, el } = crear();
    responder(fixture, pagina([
      registro(1),
      registro(2, { accion: 'ELIMINAR_PROYECTO', entidad: 'PROYECTOS', usuarioNombre: 'Luis', descripcion: null }),
      registro(3, { accion: 'ACTUALIZAR_LOTE', entidad: 'LOTES' }),
      registro(4, { accion: 'LOGIN', entidad: 'AUTH', entidadId: null })
    ]));

    const filas = el.querySelectorAll('tbody tr');
    expect(filas).toHaveLength(4);
    expect(filas[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-10-05T15:30:00');
    expect(filas[0].textContent).toContain('Ana Gómez');
    expect(filas[0].querySelector('.badge')?.textContent?.trim()).toBe('Crear usuario');
    expect(Array.from(el.querySelectorAll('.badge')).map((b) => b.className.replace('badge', '').trim())).toEqual(['crear', 'eliminar', 'editar', 'sesion']);
    expect(filas[0].textContent).toContain('Usuarios');
    expect(filas[0].textContent).toContain('#1');
    expect(filas[1].querySelector('.descripcion')?.textContent?.trim()).toBe('—');
  });

  it('ofrece un atajo a la pantalla de la entidad cuando se conoce', () => {
    const { fixture, el } = crear();
    responder(fixture, pagina([registro(1), registro(2, { entidad: 'DESCONOCIDA', accion: 'OTRA' })]));
    const enlaces = el.querySelectorAll('tbody a.atajo');
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].getAttribute('href')).toBe('/admin/usuarios');
  });

  it('sin registros muestra el aviso, sin tabla ni paginación', () => {
    const { fixture, el } = crear();
    responder(fixture, pagina([], { totalElementos: 0, totalPaginas: 0 }));
    expect(el.textContent).toContain('No hay cambios registrados con esos filtros');
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelector('.paginacion')).toBeNull();
  });

  it('si falla muestra el error y "Reintentar" vuelve a pedir la misma página', () => {
    const { fixture, el } = crear();
    principal().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el historial');

    el.querySelector<HTMLButtonElement>('.estado-error button')!.click();
    expect(principal().request.params.get('page')).toBe('0');
  });

  describe('filtros', () => {
    it('envía solo los filtros con valor y vuelve a la primera página', () => {
      const { fixture, c } = crear();
      responder(fixture, pagina([registro(1)], { totalPaginas: 3, totalElementos: 41, pagina: 1 }));

      c.filtros = { usuarioId: '5', entidad: '', accion: 'CREAR_USUARIO', texto: ' lote ', desde: '2026-10-01', hasta: '2026-10-31' };
      c.buscar();
      const req = principal();
      expect(req.request.params.get('usuarioId')).toBe('5');
      expect(req.request.params.has('entidad')).toBe(false);
      expect(req.request.params.get('accion')).toBe('CREAR_USUARIO');
      expect(req.request.params.get('texto')).toBe('lote');
      expect(req.request.params.get('desde')).toBe('2026-10-01');
      expect(req.request.params.get('hasta')).toBe('2026-10-31');
      expect(req.request.params.get('page')).toBe('0');
      req.flush(pagina([]));
    });

    it('rechaza fechas invertidas sin pedir nada', () => {
      const { fixture, c, el } = crear();
      responder(fixture, pagina([registro(1)]));
      c.filtros = { ...c.filtros, desde: '2026-10-20', hasta: '2026-10-10' };
      c.buscar();
      fixture.detectChanges();
      expect(el.querySelector('.error-filtros')?.textContent).toContain('posterior');
      http.expectNone((r) => r.url === URL);
    });

    it('"Limpiar" borra los filtros y vuelve a pedir sin ellos', () => {
      const { fixture, c } = crear();
      responder(fixture, pagina([registro(1)]));
      c.filtros = { ...c.filtros, usuarioId: '5', texto: 'x' };
      c.buscar();
      principal().flush(pagina([registro(1)]));
      c.limpiar();
      const req = principal();
      expect(req.request.params.has('usuarioId')).toBe(false);
      expect(req.request.params.has('texto')).toBe(false);
      req.flush(pagina([]));
    });
  });

  describe('paginación', () => {
    it('muestra "Página X de Y", total y navega con Anterior / Siguiente conservando los filtros aplicados', () => {
      const { fixture, c, el } = crear();
      responder(fixture, pagina([]));
      c.filtros.texto = 'lote';
      c.buscar();
      responder(fixture, pagina([registro(1)], { totalPaginas: 3, totalElementos: 41, pagina: 0 }));

      const texto = () => el.querySelector('.paginacion')?.textContent?.replace(/\s+/g, ' ');
      expect(texto()).toContain('41 registros');
      expect(texto()).toContain('Página 1 de 3');
      const [anterior, siguiente] = Array.from(el.querySelectorAll<HTMLButtonElement>('.paginacion button'));
      expect(anterior.disabled).toBe(true);
      expect(siguiente.disabled).toBe(false);

      // El campo se edita pero no se aplica hasta pulsar "Filtrar": la página 2 sigue usando el filtro anterior
      c.filtros.texto = 'otro';
      siguiente.click();
      const req = principal();
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('texto')).toBe('lote');
      req.flush(pagina([registro(2)], { totalPaginas: 3, totalElementos: 41, pagina: 1 }));
      fixture.detectChanges();
      expect(texto()).toContain('Página 2 de 3');

      el.querySelectorAll<HTMLButtonElement>('.paginacion button')[0].click();
      expect(principal().request.params.get('page')).toBe('0');
    });

    it('en la última página deshabilita "Siguiente"', () => {
      const { fixture, el } = crear();
      responder(fixture, pagina([registro(1)], { totalPaginas: 2, totalElementos: 26, pagina: 1 }));
      const [anterior, siguiente] = Array.from(el.querySelectorAll<HTMLButtonElement>('.paginacion button'));
      expect(anterior.disabled).toBe(false);
      expect(siguiente.disabled).toBe(true);
    });
  });
});
