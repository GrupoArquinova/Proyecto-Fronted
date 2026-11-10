import { describe, expect, it } from 'vitest';
import {
  anchoBarra, completarDias, errorDeRango, fechaCorta, fechaHoraLocal, fechaIso, humanizar, leerFechaIso, maximoAmable,
  normalizarMetricas, porcentaje, ultimosDias
} from './metricas';

describe('utilidades de métricas', () => {
  it('normaliza una respuesta vacía o incompleta sin romper (todo en cero o listas vacías)', () => {
    for (const vacio of [null, undefined, {}]) {
      const m = normalizarMetricas(vacio as never);
      expect(m.solicitudes).toEqual({ total: 0, porSemana: [], porProyecto: [], porEstado: [] });
      expect(m.analitica.embudo).toEqual({ vistasProyecto: 0, clicksWhatsapp: 0, formulariosEnviados: 0, descargasBrochure: 0 });
      expect(m.chat).toEqual({ totalPreguntas: 0, temas: [], recientes: [] });
      expect(m.lotes.porProyecto).toEqual([]);
    }
  });

  it('respeta lo que sí llega y descarta valores que no son números', () => {
    const m = normalizarMetricas({
      solicitudes: { total: 4, porSemana: [{ semana: '2026-W40', inicio: '2026-09-28', total: 4 }], porProyecto: [], porEstado: [] },
      analitica: { embudo: { vistasProyecto: 10, clicksWhatsapp: NaN as never, formulariosEnviados: '3' as never, descargasBrochure: 2 } } as never
    });
    expect(m.solicitudes.total).toBe(4);
    expect(m.solicitudes.porSemana).toHaveLength(1);
    expect(m.analitica.embudo).toEqual({ vistasProyecto: 10, clicksWhatsapp: 0, formulariosEnviados: 0, descargasBrochure: 2 });
  });

  it('fechas locales sin desfase de zona horaria', () => {
    const f = leerFechaIso('2026-10-05')!;
    expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([2026, 9, 5]);
    expect(fechaIso(f)).toBe('2026-10-05');
    expect(leerFechaIso('basura')).toBeNull();
    expect(fechaCorta('2026-10-05')).toBe('5 oct');
    expect(fechaCorta('xx')).toBe('xx');
  });

  it('"últimos N días" cuenta hoy', () => {
    const hoy = new Date(2026, 9, 31);
    expect(ultimosDias(7, hoy)).toEqual({ desde: '2026-10-25', hasta: '2026-10-31' });
    expect(ultimosDias(30, hoy)).toEqual({ desde: '2026-10-02', hasta: '2026-10-31' });
    expect(ultimosDias(1, hoy)).toEqual({ desde: '2026-10-31', hasta: '2026-10-31' });
  });

  describe('rango personalizado', () => {
    const hoy = new Date(2026, 9, 31);
    it('acepta un rango válido', () => expect(errorDeRango('2026-10-01', '2026-10-31', hoy)).toBeNull());
    it('pide las dos fechas', () => {
      expect(errorDeRango('', '2026-10-31', hoy)).toMatch(/Elige/);
      expect(errorDeRango('2026-10-01', '', hoy)).toMatch(/Elige/);
    });
    it('rechaza inicio posterior al fin, futuro y rangos de más de un año', () => {
      expect(errorDeRango('2026-10-20', '2026-10-10', hoy)).toMatch(/posterior/);
      expect(errorDeRango('2026-10-01', '2026-11-05', hoy)).toMatch(/futuro/);
      expect(errorDeRango('2025-01-01', '2026-10-31', hoy)).toMatch(/366/);
    });
  });

  it('el porcentaje y el ancho nunca dan NaN ni dividen por cero', () => {
    expect(porcentaje(5, 0)).toBe(0);
    expect(porcentaje(5, 10)).toBe(50);
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(NaN, 10)).toBe(0);
    expect(anchoBarra(5, 0)).toBe(0);
    expect(anchoBarra(0, 10)).toBe(0);
    expect(anchoBarra(10, 10)).toBe(100);
    expect(anchoBarra(1, 1000)).toBe(2); // una barra pequeña pero visible
  });

  it('el tope del eje es 1, 2, 5 × 10^n y nunca queda por debajo del máximo', () => {
    expect(maximoAmable(0)).toBe(1);
    expect(maximoAmable(-3)).toBe(1);
    expect(maximoAmable(NaN)).toBe(1);
    expect(maximoAmable(1)).toBe(1);
    expect(maximoAmable(3)).toBe(5);
    expect(maximoAmable(7)).toBe(10);
    expect(maximoAmable(23)).toBe(50);
    expect(maximoAmable(101)).toBe(200);
    for (const n of [1, 2, 4, 9, 11, 49, 51, 999]) expect(maximoAmable(n)).toBeGreaterThanOrEqual(n);
  });

  it('completa con ceros los días sin visitas', () => {
    const r = completarDias([{ fecha: '2026-10-02', total: 3 }, { fecha: '2026-10-04T00:00:00', total: 1 }], '2026-10-01', '2026-10-05');
    expect(r).toEqual([
      { fecha: '2026-10-01', total: 0 }, { fecha: '2026-10-02', total: 3 }, { fecha: '2026-10-03', total: 0 },
      { fecha: '2026-10-04', total: 1 }, { fecha: '2026-10-05', total: 0 }
    ]);
  });

  it('con un período inválido muestra solo los días que llegaron, ordenados', () => {
    const r = completarDias([{ fecha: '2026-10-04', total: 1 }, { fecha: '2026-10-02', total: 3 }], '', '');
    expect(r.map((x) => x.fecha)).toEqual(['2026-10-02', '2026-10-04']);
  });

  it('humaniza temas y fechas', () => {
    expect(humanizar('PREGUNTAS_FRECUENTES')).toBe('Preguntas frecuentes');
    expect(humanizar('')).toBe('Sin clasificar');
    expect(humanizar(undefined as never)).toBe('Sin clasificar');
    expect(fechaHoraLocal('no es fecha')).toBe('no es fecha');
    expect(fechaHoraLocal('2026-10-05T15:30:00')).toMatch(/5/);
    expect(fechaHoraLocal('')).toBe('');
  });
});
