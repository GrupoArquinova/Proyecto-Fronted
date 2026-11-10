import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { ToastService } from '../../../core/services/toast.service';
import { ReportesComponent } from './reportes.component';

const API = environment.apiUrl;

describe('ReportesComponent · casos de pantalla y descargas', () => {
  let http: HttpTestingController;

  function crear() {
    TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()],
    });
    const fixture = TestBed.createComponent(ReportesComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${API}/reportes/dashboard`).flush({
      totalProyectos: 1, proyectosPublicados: 1, totalLotes: 1, lotesDisponibles: 1, lotesReservados: 0, lotesVendidos: 0,
      totalSolicitudes: 3, solicitudesNuevas: 1, distribucionLotesPorEstado: {}, distribucionSolicitudesPorEstado: { NUEVO: 1, EN_GESTION: 2 },
    });
    http.expectOne(`${API}/proyectos`).flush([
      { id: 1, nombre: 'Los Andes', activo: true },
      { id: 2, nombre: 'Viejo', activo: false },
    ]);
    http.expectOne(`${API}/estados-solicitud/activos`).flush([{ id: 1, nombre: 'NUEVO', orden: 1, activo: true }]);
    http.expectOne(r => r.url === `${API}/reportes/lotes`).flush([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const filas = () => el.querySelectorAll('.tabla-reporte tbody tr');
    return { fixture, el, c: fixture.componentInstance, filas };
  }

  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:prueba');
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('una descarga exitosa crea el enlace, lo pulsa con el nombre del archivo y avisa', () => {
    const { c } = crear();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    c.proyectoId.set(1);

    c.exportar('excel');
    expect(c.cargando).toBe(true);
    http.expectOne(r => r.url === `${API}/documentos/excel/lotes`).flush(new Blob(['datos']));

    expect(clic).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
    expect(c.cargando).toBe(false);
    const aviso = TestBed.inject(ToastService).toasts().find(t => t.type === 'success');
    expect(aviso?.message).toMatch(/Reporte_Lotes_\d{4}-\d{2}-\d{2}\.xlsx/);
  });

  it('el PDF lleva su extensión y si la descarga falla avisa y deja de cargar', () => {
    const { c } = crear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    c.exportar('pdf');
    http.expectOne(r => r.url === `${API}/documentos/pdf/lotes`).flush(null, { status: 500, statusText: 'Error' });

    expect(c.cargando).toBe(false);
    expect(TestBed.inject(ToastService).toasts().some(t => t.message.includes('No se pudo completar la descarga'))).toBe(true);
  });

  it('la ficha técnica descarga el PDF del proyecto elegido; sin proyecto no hace nada', () => {
    const { c } = crear();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    c.proyectoIdPdf = null;
    c.descargarFichaPdf();
    http.expectNone(r => r.url.includes('/documentos/'));

    c.proyectoIdPdf = 2;
    c.descargarFichaPdf();
    http.expectOne(`${API}/documentos/pdf/proyecto/2/ficha-tecnica`).flush(new Blob(['pdf']));
    expect(TestBed.inject(ToastService).toasts().some(t => t.message.includes('Ficha_Tecnica_Proyecto_2.pdf'))).toBe(true);
  });

  it('cada pestaña dibuja las columnas de su reporte con los datos que llegan', () => {
    const { c, fixture, filas, el } = crear();

    c.elegirPestana('proyectos');
    http.expectOne(r => r.url === `${API}/reportes/proyectos`).flush([
      { id: 1, nombre: 'Los Andes', empresaNombre: 'Arquinova', estadoProyecto: 'EN_CONSTRUCCION', publicado: true, activo: true, fechaLanzamiento: '2026-10-31', totalLotes: 12, creadoEn: '2026-09-16T10:00:00' },
    ]);
    fixture.detectChanges();
    expect(filas()[0].textContent).toContain('En construcción');
    expect(filas()[0].textContent).toContain('31/10/2026');

    c.elegirPestana('etapas');
    http.expectOne(r => r.url === `${API}/reportes/etapas`).flush([
      { proyectoNombre: 'Los Andes', etapaNombre: 'Etapa 1', totalLotes: 20, disponibles: 10, reservados: 5, vendidos: 5, areaTotalM2: 16000 },
    ]);
    fixture.detectChanges();
    expect(filas()[0].textContent).toContain('16.000,00');
    expect(el.querySelector('.celda-barra')?.textContent).toContain('25,0 %');

    c.elegirPestana('estados-comerciales');
    http.expectOne(r => r.url === `${API}/reportes/estados-comerciales`).flush([
      { proyectoNombre: 'Los Andes', estadoNombre: 'DISPONIBLE', cantidadLotes: 10, porcentaje: 50 },
    ]);
    fixture.detectChanges();
    expect(filas()[0].textContent).toContain('Disponible');

    c.elegirPestana('solicitudes');
    http.expectOne(r => r.url === `${API}/reportes/solicitudes`).flush([
      { clienteNombre: 'Ana', clienteCorreo: 'a@a.co', clienteTelefono: '300', proyectoNombre: 'Los Andes', tipologiaNombre: 'Villa Samán', mensaje: 'Hola', estadoNombre: 'EN_GESTION', atendidaPorNombre: 'Sin Atender', creadoEn: '2026-10-14T10:05:00' },
    ]);
    fixture.detectChanges();
    expect(filas()[0].textContent).toContain('Villa Samán');
    expect(filas()[0].textContent).toContain('En gestión');
    expect(el.querySelector('td.largo')?.getAttribute('title')).toBe('Hola');

    c.elegirPestana('actividad');
    http.expectOne(r => r.url === `${API}/reportes/actividad`).flush([
      { usuarioNombre: 'Admin', accion: 'CREAR_PROYECTO', entidad: 'PROYECTOS', descripcion: 'Creación', ip: '127.0.0.1', creadoEn: '2026-10-14T10:05:00' },
    ]);
    fixture.detectChanges();
    expect(filas()[0].textContent).toContain('CREAR_PROYECTO');
  });

  it('volver a pulsar la pestaña activa no vuelve a consultar', () => {
    const { c } = crear();

    c.elegirPestana('lotes');

    http.expectNone(r => r.url === `${API}/reportes/lotes`);
  });

  it('los filtros de etapa del proyecto y de estado de solicitud se envían cuando aplican', () => {
    const { c } = crear();

    c.elegirPestana('proyectos');
    http.expectOne(r => r.url === `${API}/reportes/proyectos`).flush([]);
    c.estadoProyecto.set('FINALIZADO');
    c.consultar();
    expect(http.expectOne(r => r.url === `${API}/reportes/proyectos`).request.params.get('estadoProyecto')).toBe('FINALIZADO');

    c.elegirPestana('solicitudes');
    http.match(r => r.url === `${API}/reportes/proyectos`);
    c.estadoSolicitudId.set(1);
    c.consultar();
    http.match(r => r.url === `${API}/reportes/solicitudes`);
    const ultima = c.filtro();
    expect(ultima.estadoSolicitudId).toBe(1);
    expect(ultima.estadoProyecto).toBeNull();
  });

  it('"Limpiar filtros" deja todo en blanco y vuelve a consultar', () => {
    const { c } = crear();
    c.proyectoId.set(1);
    c.estadoLoteId.set(2);
    c.estadoSolicitudId.set(3);
    c.estadoProyecto.set('FINALIZADO');
    c.fechaInicio.set('2026-10-01');
    c.fechaFin.set('2026-10-20');
    c.incluirInactivos.set(true);

    c.limpiarFiltros();

    const peticion = http.expectOne(r => r.url === `${API}/reportes/lotes`);
    expect(peticion.request.params.keys()).toEqual([]);
    expect([c.proyectoId(), c.estadoLoteId(), c.estadoSolicitudId(), c.estadoProyecto(), c.fechaInicio(), c.fechaFin(), c.incluirInactivos()])
      .toEqual([null, null, null, null, '', '', false]);
    peticion.flush([]);
  });

  it('si el reporte falla muestra el error y avisa; con más de 100 filas muestra las primeras y lo dice', () => {
    const { c, fixture, el } = crear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    c.consultar();
    http.expectOne(r => r.url === `${API}/reportes/lotes`).flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(c.errorTabla()).toBe(true);
    expect(el.textContent).toContain('No se pudo cargar el reporte. Inténtalo de nuevo.');

    c.consultar();
    const lote = (n: number) => ({ proyectoNombre: 'P', etapaNombre: 'E', codigo: `LT-${n}`, areaM2: 100, estadoComercial: 'DISPONIBLE', publicado: true, activo: true, creadoEn: '2026-10-14T09:00:00' });
    http.expectOne(r => r.url === `${API}/reportes/lotes`).flush(Array.from({ length: 130 }, (_, i) => lote(i)));
    fixture.detectChanges();
    expect(c.hayMas()).toBe(true);
    expect(el.querySelectorAll('.tabla-reporte tbody tr').length).toBe(100);
    expect(el.querySelector('.nota-limite')?.textContent).toContain('100 de 130');
    expect(el.querySelector('.conteo')?.textContent).toContain('130 registros');
  });

  it('un solo registro dice "registro" en singular y el selector acepta "todos" como nulo', () => {
    const { c, fixture, el } = crear();

    c.consultar();
    http.expectOne(r => r.url === `${API}/reportes/lotes`).flush([{ proyectoNombre: 'P', etapaNombre: 'E', codigo: 'LT-1', areaM2: 1, estadoComercial: 'VENDIDO', publicado: false, activo: true, creadoEn: '2026-10-14T09:00:00' }]);
    fixture.detectChanges();

    expect(el.querySelector('.conteo')?.textContent).toContain('1 registro');
    expect(el.querySelector('.conteo')?.textContent).not.toContain('registros');
    expect(c.numeroONulo('')).toBeNull();
    expect(c.numeroONulo('null')).toBeNull();
    expect(c.numeroONulo(undefined)).toBeNull();
    expect(c.numeroONulo('7')).toBe(7);
  });

  it('las solicitudes por estado salen ordenadas y con nombres legibles; el porcentaje usa coma', () => {
    const { c } = crear();

    expect(c.solicitudesPorEstado).toEqual([{ nombre: 'En gestión', cantidad: 2 }, { nombre: 'Nuevo', cantidad: 1 }]);
    expect(c.porcentaje(25)).toBe('25,0');
    expect(c.porcentaje('33.333')).toBe('33,3');
    expect(c.legible('EN_TRAMITE')).toBe('En trámite');
  });
});
