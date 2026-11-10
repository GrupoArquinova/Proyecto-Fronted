import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { MetricasComponent } from './metricas.component';
import { iniciarSesionFalsa } from '../../../core/testing/jwt-falso';
import { environment } from '../../../../environments/environment';
import { fechaIso } from '../../../core/utils/metricas';

const URL = `${environment.apiUrl}/admin/metricas`;

const datos = {
  periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
  solicitudes: {
    total: 12,
    porSemana: [{ semana: '2026-W40', inicio: '2026-09-28', total: 5 }, { semana: '2026-W41', inicio: '2026-10-05', total: 7 }],
    porProyecto: [{ proyectoId: 6, proyecto: 'El Encanto', total: 9 }, { proyectoId: 7, proyecto: 'La Hacienda', total: 3 }],
    porEstado: [{ estado: 'NUEVO', total: 12 }]
  },
  lotes: {
    porEstado: [{ estado: 'DISPONIBLE', total: 8 }],
    porProyecto: [{ proyectoId: 6, proyecto: 'El Encanto', disponibles: 8, reservados: 2, vendidos: 4, total: 14 }]
  },
  analitica: {
    visitasPorProyecto: [{ proyectoId: 6, proyecto: 'El Encanto', vistas: 120 }],
    eventosPorTipo: [{ tipo: 'VISTA_PROYECTO', total: 120 }],
    visitasPorDia: [{ fecha: '2026-10-02', total: 30 }, { fecha: '2026-10-04', total: 10 }],
    embudo: { vistasProyecto: 120, clicksWhatsapp: 40, formulariosEnviados: 12, descargasBrochure: 6 }
  },
  chat: {
    totalPreguntas: 15,
    temas: [{ tema: 'UBICACION', total: 9 }, { tema: 'PRECIOS', total: 6 }],
    recientes: [{ fecha: '2026-10-30T15:30:00', pregunta: '¿Dónde queda El Encanto?', tema: 'UBICACION' }]
  }
};

describe('MetricasComponent', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function crear(rol = 'ROLE_ADMINISTRADOR') {
    iniciarSesionFalsa(rol);
    TestBed.configureTestingModule({ imports: [MetricasComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MetricasComponent);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const responder = (fixture: { detectChanges(): void }, cuerpo: object = datos) => {
    http.expectOne((r) => r.url === URL).flush(structuredClone(cuerpo));
    fixture.detectChanges();
  };

  it('arranca en 30 días, muestra "Cargando" y luego las tarjetas con los totales', () => {
    const { fixture, el, c } = crear();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Cargando métricas');
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('hasta')).toBe(fechaIso(new Date()));
    expect(c.seleccion()).toBe(30);
    req.flush(structuredClone(datos));
    fixture.detectChanges();

    const tarjeta = (id: string) => el.querySelector(`[data-tarjeta="${id}"] .numero`)?.textContent?.trim();
    expect(tarjeta('solicitudes')).toBe('12');
    expect(tarjeta('visitas')).toBe('120');
    expect(tarjeta('whatsapp')).toBe('40');
    expect(tarjeta('formularios')).toBe('12');
    expect(tarjeta('descargas')).toBe('6');
  });

  it('dibuja las gráficas: solicitudes por semana, por proyecto, lotes, visitas, embudo, visitas por día y temas', () => {
    const { fixture, el } = crear();
    responder(fixture);

    const titulos = Array.from(el.querySelectorAll('.panel h2')).map((h) => h.textContent?.trim());
    expect(titulos).toEqual([
      'Solicitudes por semana', 'Solicitudes por proyecto', 'Lotes por estado', 'Visitas por proyecto', 'Embudo de interés',
      'Visitas por día', 'Temas más preguntados al asistente', 'Preguntas recientes del chat'
    ]);
    // Gráficas SVG con texto alternativo y tabla de respaldo
    const svgs = el.querySelectorAll('svg[role="img"]');
    expect(svgs).toHaveLength(2);
    for (const svg of Array.from(svgs)) expect(svg.getAttribute('aria-label')).toMatch(/Total: \d+/);
    expect(el.querySelectorAll('details.tabla-alterna table')).toHaveLength(2);
    // Barras con su valor en texto
    expect(el.querySelector('[aria-label="Solicitudes por proyecto"]')?.textContent).toContain('El Encanto');
    expect(el.querySelector('[aria-label="Lotes por estado en cada proyecto"]')?.textContent).toContain('8 disponibles, 2 reservados, 4 vendidos. Total 14.');
    expect(el.querySelector('[aria-label="Temas más preguntados al asistente"]')?.textContent).toContain('Ubicacion');
  });

  it('el embudo muestra cada paso con su porcentaje sobre las vistas, y la conversión', () => {
    const { fixture, el } = crear();
    responder(fixture);
    const filas = Array.from(el.querySelectorAll('[aria-label^="Embudo"] li')).map((l) => l.textContent?.replace(/\s+/g, ' ').trim());
    expect(filas[0]).toContain('120(100%)');
    expect(filas[1]).toContain('40(33%)');
    expect(filas[2]).toContain('12(10%)');
    expect(filas[3]).toContain('6(5%)');
    expect(el.textContent).toContain('10% de las visitas a proyectos terminó en un formulario');
  });

  it('las preguntas recientes del chat solo las ve el administrador', () => {
    const admin = crear('ROLE_ADMINISTRADOR');
    responder(admin.fixture);
    expect(admin.el.querySelector('.recientes')?.textContent).toContain('¿Dónde queda El Encanto?');
    expect(admin.el.querySelector('.recientes .tema')?.textContent?.trim()).toBe('Ubicacion');

    TestBed.resetTestingModule();
    const comercial = crear('ROLE_COMERCIAL');
    responder(comercial.fixture);
    expect(comercial.el.querySelector('#m-recientes')).toBeNull();
    expect(comercial.el.textContent).not.toContain('Dónde queda El Encanto');
  });

  it('un administrador sin preguntas ve el aviso de lista vacía', () => {
    const { fixture, el } = crear();
    responder(fixture, { ...datos, chat: { totalPreguntas: 0, temas: [], recientes: [] } });
    expect(el.querySelector('#m-recientes')?.parentElement?.textContent).toContain('No hay preguntas en este período');
    expect(el.textContent).toContain('El asistente no recibió preguntas en este período');
  });

  it('sin ningún dato muestra estados vacíos en cada gráfica, sin NaN ni undefined', () => {
    const { fixture, el } = crear();
    responder(fixture, {});
    const texto = el.textContent ?? '';
    expect(texto).not.toMatch(/NaN|undefined|Infinity/);
    expect(texto).toContain('No hubo solicitudes en este período.');
    expect(texto).toContain('Todavía no hay lotes registrados.');
    expect(texto).toContain('Aún no hay visitas registradas en este período.');
    expect(texto).toContain('Aún no hay actividad registrada en este período.');
    expect(el.querySelectorAll('svg')).toHaveLength(0);
    expect(el.querySelector('[data-tarjeta="solicitudes"] .numero')?.textContent?.trim()).toBe('0');
    expect(texto).not.toContain('terminó en un formulario'); // sin vistas no hay conversión que mostrar
  });

  it('si falla la carga muestra el error y "Reintentar" vuelve a pedir', () => {
    const { fixture, el } = crear();
    http.expectOne((r) => r.url === URL).flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar las métricas');
    expect(el.querySelector('.tarjetas')).toBeNull();

    el.querySelector<HTMLButtonElement>('.estado-error button')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    responder(fixture);
    expect(el.querySelector('.tarjetas')).not.toBeNull();
  });

  describe('selector de período', () => {
    it('los botones 7, 30 y 90 días piden ese período y marcan el activo', () => {
      const { fixture, el } = crear();
      responder(fixture);

      const botones = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.selector .opcion'));
      expect(botones().map((b) => b.textContent?.trim())).toEqual(['7 días', '30 días', '90 días', 'Personalizado']);

      botones()[0].click();
      fixture.detectChanges();
      const req = http.expectOne((r) => r.url === URL);
      const desde = new Date(req.request.params.get('desde') + 'T00:00:00');
      const hasta = new Date(req.request.params.get('hasta') + 'T00:00:00');
      expect(Math.round((hasta.getTime() - desde.getTime()) / 86_400_000)).toBe(6);
      req.flush(structuredClone(datos));
      fixture.detectChanges();
      expect(botones()[0].getAttribute('aria-pressed')).toBe('true');
      expect(botones()[1].getAttribute('aria-pressed')).toBe('false');

      botones()[2].click();
      const req90 = http.expectOne((r) => r.url === URL);
      expect(req90.request.params.get('desde')! < req.request.params.get('desde')!).toBe(true);
      req90.flush(structuredClone(datos));
    });

    it('el rango personalizado valida las fechas y solo pide cuando son válidas', () => {
      const { fixture, el, c } = crear();
      responder(fixture);

      el.querySelectorAll<HTMLButtonElement>('.selector .opcion')[3].click();
      fixture.detectChanges();
      expect(el.querySelector('form.rango')).not.toBeNull();

      c.desdePersonal = '2026-10-20';
      c.hastaPersonal = '2026-10-10';
      c.aplicarRango();
      fixture.detectChanges();
      expect(el.querySelector('.error-rango')?.textContent).toContain('posterior');
      http.expectNone((r) => r.url === URL);

      c.desdePersonal = '2026-10-01';
      c.hastaPersonal = '2026-10-15';
      c.aplicarRango();
      fixture.detectChanges();
      expect(el.querySelector('.error-rango')).toBeNull();
      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.get('desde')).toBe('2026-10-01');
      expect(req.request.params.get('hasta')).toBe('2026-10-15');
      req.flush(structuredClone(datos));
    });

    it('si se cambia de período mientras carga, solo vale la última respuesta', () => {
      const { fixture, el, c } = crear();
      const primera = http.expectOne((r) => r.url === URL);
      c.elegir(7);
      expect(primera.cancelled).toBe(true);
      const segunda = http.expectOne((r) => r.url === URL);
      segunda.flush(structuredClone({ ...datos, solicitudes: { ...datos.solicitudes, total: 99 } }));
      fixture.detectChanges();
      expect(el.querySelector('[data-tarjeta="solicitudes"] .numero')?.textContent?.trim()).toBe('99');
    });
  });
});
