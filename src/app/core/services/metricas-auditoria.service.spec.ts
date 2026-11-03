import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MetricasService } from './metricas.service';
import { PaginaAuditoria } from '../models/auditoria.models';
import { RolService } from './rol.service';
import { AuditoriaService } from './auditoria.service';
import { environment } from '../../../environments/environment';

describe('MetricasService y AuditoriaService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('las métricas se piden con el período y se normalizan', () => {
    let resultado: unknown;
    TestBed.inject(MetricasService).obtener({ desde: '2026-10-01', hasta: '2026-10-31' }).subscribe((m) => (resultado = m));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/admin/metricas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('desde')).toBe('2026-10-01');
    expect(req.request.params.get('hasta')).toBe('2026-10-31');
    req.flush({ solicitudes: { total: 3 } });
    expect(resultado).toMatchObject({ solicitudes: { total: 3, porSemana: [] }, chat: { recientes: [] } });
  });

  it('el historial se pide con filtros y paginación, sin mandar los vacíos', () => {
    TestBed.inject(AuditoriaService).listar({ usuarioId: 5, entidad: '  ', accion: undefined, texto: 'lote', page: 2, size: 25 }).subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/admin/auditoria`);
    expect(req.request.params.keys().sort()).toEqual(['page', 'size', 'texto', 'usuarioId']);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ contenido: [], pagina: 2, tamano: 25, totalElementos: 0, totalPaginas: 0 });
  });

  it('el historial normaliza una página con datos faltantes', () => {
    let pagina: PaginaAuditoria | undefined;
    TestBed.inject(AuditoriaService).listar().subscribe((p) => (pagina = p));
    http.expectOne((r) => r.url === `${environment.apiUrl}/admin/auditoria`).flush({ contenido: [{ id: 1, usuarioNombre: 'Ana' }] });
    expect(pagina?.contenido[0].usuarioNombre).toBe('Ana');
    expect(pagina?.contenido[0].entidadId).toBeNull();
    expect(pagina?.totalPaginas).toBe(1);
  });

  it('los filtros del historial se normalizan', () => {
    let f: unknown;
    TestBed.inject(AuditoriaService).filtros().subscribe((x) => (f = x));
    http.expectOne(environment.apiUrl + '/admin/auditoria/filtros').flush({ entidades: ['A'] });
    expect(f).toEqual({ entidades: ['A'], acciones: [] });
  });

  it('los roles se piden a /roles', () => {
    TestBed.inject(RolService).listar().subscribe();
    http.expectOne(environment.apiUrl + '/roles').flush([]);
  });
});
