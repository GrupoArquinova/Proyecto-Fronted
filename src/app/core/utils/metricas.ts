import { Metricas, PeriodoMetricas } from '../models/metricas.models';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Completa lo que el backend no mande (secciones o listas ausentes) para que la pantalla nunca falle por un dato faltante. */
export function normalizarMetricas(raw: Partial<Metricas> | null | undefined): Metricas {
  const r = raw ?? {};
  const lista = <T>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
  const e = r.analitica?.embudo;
  return {
    periodo: { desde: r.periodo?.desde ?? '', hasta: r.periodo?.hasta ?? '' },
    solicitudes: {
      total: num(r.solicitudes?.total),
      porSemana: lista(r.solicitudes?.porSemana),
      porProyecto: lista(r.solicitudes?.porProyecto),
      porEstado: lista(r.solicitudes?.porEstado)
    },
    lotes: { porEstado: lista(r.lotes?.porEstado), porProyecto: lista(r.lotes?.porProyecto) },
    analitica: {
      visitasPorProyecto: lista(r.analitica?.visitasPorProyecto),
      eventosPorTipo: lista(r.analitica?.eventosPorTipo),
      visitasPorDia: lista(r.analitica?.visitasPorDia),
      embudo: {
        vistasProyecto: num(e?.vistasProyecto),
        clicksWhatsapp: num(e?.clicksWhatsapp),
        formulariosEnviados: num(e?.formulariosEnviados),
        descargasBrochure: num(e?.descargasBrochure)
      }
    },
    chat: { totalPreguntas: num(r.chat?.totalPreguntas), temas: lista(r.chat?.temas), recientes: lista(r.chat?.recientes) }
  };
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha local en formato YYYY-MM-DD. */
export function fechaIso(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Lee "YYYY-MM-DD" como fecha local (sin el desfase de zona horaria de `new Date('2026-10-01')`). */
export function leerFechaIso(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto ?? '');
  if (!m) return null;
  const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(f.getTime()) ? null : f;
}

/** Los últimos `dias` días, contando hoy ("últimos 7 días" = hoy y los 6 anteriores). */
export function ultimosDias(dias: number, hoy = new Date()): PeriodoMetricas {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
  return { desde: fechaIso(desde), hasta: fechaIso(hoy) };
}

/** Máximo de días que se deja pedir en un rango personalizado. */
export const MAX_DIAS_RANGO = 366;

/** Mensaje de error de un rango personalizado, o null si es válido. */
export function errorDeRango(desde: string, hasta: string, hoy = new Date()): string | null {
  const d = leerFechaIso(desde);
  const h = leerFechaIso(hasta);
  if (!d || !h) return 'Elige la fecha inicial y la final.';
  if (d > h) return 'La fecha inicial no puede ser posterior a la final.';
  if (h > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) return 'La fecha final no puede estar en el futuro.';
  const dias = Math.round((h.getTime() - d.getTime()) / 86_400_000) + 1;
  if (dias > MAX_DIAS_RANGO) return `El rango no puede superar ${MAX_DIAS_RANGO} días.`;
  return null;
}

/** Porcentaje de `valor` sobre `total`, redondeado; 0 si el total es 0 (nunca NaN ni infinito). */
export function porcentaje(valor: number, total: number): number {
  return total > 0 && Number.isFinite(valor) ? Math.round((valor / total) * 100) : 0;
}

/** Ancho (0 a 100) de una barra respecto al máximo de la serie; 0 si no hay máximo. */
export function anchoBarra(valor: number, maximo: number): number {
  return maximo > 0 && valor > 0 ? Math.max(2, Math.min(100, (valor / maximo) * 100)) : 0;
}

/** Tope "bonito" para el eje (1, 2, 5 × 10^n) que deja espacio sobre el valor más alto. Mínimo 1. */
export function maximoAmable(max: number): number {
  if (!(max > 0) || !Number.isFinite(max)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(max));
  const f = max / potencia;
  const paso = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return paso * potencia;
}

/** Días entre `desde` y `hasta` (ambos incluidos) con 0 donde el backend no mandó nada, para que la línea sea honesta. */
export function completarDias(items: { fecha: string; total: number }[], desde: string, hasta: string): { fecha: string; total: number }[] {
  const d = leerFechaIso(desde);
  const h = leerFechaIso(hasta);
  const porFecha = new Map(items.map(i => [i.fecha.slice(0, 10), num(i.total)]));
  if (!d || !h || d > h || (h.getTime() - d.getTime()) / 86_400_000 > MAX_DIAS_RANGO) {
    return [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, total]) => ({ fecha, total }));
  }
  const salida: { fecha: string; total: number }[] = [];
  for (let f = new Date(d); f <= h; f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 1)) {
    const clave = fechaIso(f);
    salida.push({ fecha: clave, total: porFecha.get(clave) ?? 0 });
  }
  return salida;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10-05" → "5 oct". */
export function fechaCorta(iso: string): string {
  const f = leerFechaIso(iso);
  return f ? `${f.getDate()} ${MESES[f.getMonth()]}` : iso;
}

/** "PREGUNTAS_FRECUENTES" → "Preguntas frecuentes". */
export function humanizar(texto: string): string {
  const limpio = (texto ?? '').replace(/_/g, ' ').trim().toLowerCase();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : 'Sin clasificar';
}

/** Fecha y hora locales legibles: "5 oct 2026, 3:30 p. m.". Si el texto no es una fecha, se devuelve tal cual. */
export function fechaHoraLocal(iso: string): string {
  const f = new Date(iso);
  if (!iso || Number.isNaN(f.getTime())) return iso ?? '';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(f);
}
