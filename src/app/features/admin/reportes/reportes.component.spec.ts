import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { ReportesComponent } from './reportes.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

describe('ReportesComponent', () => {
  function crear() {
    TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()],
    });
    const fixture = TestBed.createComponent(ReportesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(`${API}/reportes/dashboard`).flush({
      totalProyectos: 4, proyectosPublicados: 2, totalLotes: 10, lotesDisponibles: 7, lotesReservados: 2, lotesVendidos: 1,
      totalSolicitudes: 3, solicitudesNuevas: 1, distribucionLotesPorEstado: {}, distribucionSolicitudesPorEstado: { NUEVO: 1, EN_GESTION: 2 },
    });
    http.expectOne(`${API}/proyectos`).flush([
      { id: 1, nombre: 'Condominio Los Andes', activo: true },
      { id: 2, nombre: 'Proyecto viejo', activo: false },
    ]);
    http.expectOne(`${API}/estados-solicitud/activos`).flush([{ id: 1, nombre: 'NUEVO', orden: 1, activo: true }, { id: 2, nombre: 'EN_GESTION', orden: 2, activo: true }]);
    const lotes = http.expectOne((r) => r.url === `${API}/reportes/lotes`);
    lotes.flush([
      { id: 1, proyectoNombre: 'Condominio Los Andes', etapaNombre: 'Etapa 1', codigo: 'LT-01', loteNombre: 'Lote 1', areaM2: 800,
        estadoComercial: 'DISPONIBLE', publicado: true, activo: true, creadoEn: '2026-10-14T09:00:00' },
      { id: 2, proyectoNombre: 'Condominio Los Andes', etapaNombre: 'Etapa 1', codigo: 'LT-02', loteNombre: 'Lote 2', areaM2: 900,
        estadoComercial: 'VENDIDO', publicado: true, activo: true, creadoEn: '2026-10-14T09:00:00' },
    ]);
    fixture.detectChanges();
    return { fixture, http, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra los indicadores y el reporte de lotes en una tabla, no solo botones de descarga', () => {
    const { el } = crear();

    expect(el.textContent).toContain('Proyectos activos (2 publicados)');
    expect(el.textContent).toContain('Solicitudes por estado');
    expect(el.textContent).toContain('En gestión');
    const filas = el.querySelectorAll('.tabla-reporte tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('LT-01');
    expect(filas[0].textContent).toContain('Disponible');
    expect(el.querySelector('.conteo')?.textContent).toContain('2 registros');
  });

  it('el selector de la ficha técnica empieza en un proyecto activo y marca los inactivos', () => {
    const { componente, el } = crear();

    expect(componente.proyectoIdPdf).toBe(1);
    expect(el.querySelector('#reportes-ficha')?.textContent).toContain('Proyecto viejo (inactivo)');
  });

  it('al elegir un proyecto o incluir inactivos pide el reporte con esos filtros', () => {
    const { componente, http } = crear();

    componente.proyectoId.set(componente.numeroONulo('1'));
    componente.incluirInactivos.set(true);
    componente.consultar();

    const peticion = http.expectOne((r) => r.url === `${API}/reportes/lotes`);
    expect(peticion.request.params.get('proyectoId')).toBe('1');
    expect(peticion.request.params.get('incluirInactivos')).toBe('true');
    expect(peticion.request.params.has('estadoLoteId')).toBe(false);
    peticion.flush([]);
  });

  it('cada pestaña pide su propio reporte y solo manda los filtros que le aplican', () => {
    const { componente, http } = crear();
    componente.estadoLoteId.set(3);
    componente.fechaInicio.set('2026-10-01');

    componente.elegirPestana('solicitudes');
    const solicitudes = http.expectOne((r) => r.url === `${API}/reportes/solicitudes`);
    expect(solicitudes.request.params.get('fechaInicio')).toBe('2026-10-01');
    expect(solicitudes.request.params.has('estadoLoteId')).toBe(false);
    solicitudes.flush([]);

    componente.elegirPestana('etapas');
    const etapas = http.expectOne((r) => r.url === `${API}/reportes/etapas`);
    expect(etapas.request.params.has('fechaInicio')).toBe(false);
    etapas.flush([]);
  });

  it('el Excel y el PDF se piden con los mismos filtros que se ven en pantalla', () => {
    const { componente, http } = crear();
    componente.proyectoId.set(1);
    componente.estadoLoteId.set(2);

    componente.exportar('excel');
    const excel = http.expectOne((r) => r.url === `${API}/documentos/excel/lotes`);
    expect(excel.request.params.get('proyectoId')).toBe('1');
    expect(excel.request.params.get('estadoLoteId')).toBe('2');
    excel.error(new ProgressEvent('error'));

    componente.exportar('pdf');
    http.expectOne((r) => r.url === `${API}/documentos/pdf/lotes`).error(new ProgressEvent('error'));
  });

  it('con un rango de fechas al revés no consulta ni exporta y avisa', () => {
    const { componente, http, fixture, el } = crear();

    componente.fechaInicio.set('2026-10-20');
    componente.fechaFin.set('2026-10-01');
    componente.consultar();
    componente.exportar('excel');
    fixture.detectChanges();

    http.expectNone((r) => r.url.startsWith(`${API}/reportes/lotes`));
    http.expectNone((r) => r.url.startsWith(`${API}/documentos`));
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('no puede ser posterior');
  });

  it('si una respuesta tarda y llega otra más nueva, vale la última pedida', () => {
    const { componente, http } = crear();

    componente.proyectoId.set(1);
    componente.consultar();
    const primera = http.expectOne((r) => r.url === `${API}/reportes/lotes`);
    componente.proyectoId.set(2);
    componente.consultar();
    const segunda = http.expectOne((r) => r.url === `${API}/reportes/lotes`);

    segunda.flush([{ id: 9, codigo: 'LT-09' }]);
    primera.flush([{ id: 1, codigo: 'LT-01' }, { id: 2, codigo: 'LT-02' }]);

    expect(componente.filas().length).toBe(1);
  });
});
