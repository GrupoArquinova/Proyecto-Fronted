import { Lote } from '../models/lote.models';

export type ClaveEstadoLote = 'disponible' | 'reservado' | 'vendido' | 'otro';

export interface EstadoLoteVista {
  clave: ClaveEstadoLote;
  etiqueta: string;
}

/** El backend envía el estado en mayúsculas (DISPONIBLE, RESERVADO, VENDIDO); el id 1 es "Disponible". */
export function estadoDeLote(lote: Pick<Lote, 'estadoId' | 'estadoNombre'>): EstadoLoteVista {
  const nombre = (lote.estadoNombre ?? '').trim().toUpperCase();
  if (nombre === 'DISPONIBLE' || (!nombre && lote.estadoId === 1)) return { clave: 'disponible', etiqueta: 'Disponible' };
  if (nombre === 'RESERVADO') return { clave: 'reservado', etiqueta: 'Reservado' };
  if (nombre === 'VENDIDO') return { clave: 'vendido', etiqueta: 'Vendido' };
  return { clave: 'otro', etiqueta: lote.estadoNombre ?? 'Sin estado' };
}

/** Orden natural por código: L2 antes que L10, M1 después de L3. */
export function ordenarLotes<T extends Pick<Lote, 'codigo'>>(lotes: T[]): T[] {
  return [...lotes].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true, sensitivity: 'base' }));
}

/** 800 → "800 m²", 1100 → "1.100 m²", 420.5 → "420,5 m²" (formato colombiano). */
export function formatoArea(area: number | null | undefined): string {
  if (area == null) return '';
  return `${Number(area).toLocaleString('es-CO', { maximumFractionDigits: 2 })} m²`;
}

export function formatoPrecio(precio: number | null | undefined): string {
  if (precio == null) return '';
  return Number(precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export interface PosicionPlano {
  /** Porcentaje (0-100) desde el borde izquierdo / superior de la imagen. */
  x: number;
  y: number;
}

/**
 * Convierte posicionX/posicionY del lote a porcentajes sobre la imagen del plano.
 * El backend no fija una escala, así que se asume: si TODAS las posiciones del proyecto
 * están entre 0 y 1 son fracciones del ancho/alto; de lo contrario ya son porcentajes (0-100).
 * Devuelve null para los lotes sin posición.
 */
export function posicionesEnPlano(lotes: Lote[]): Map<number, PosicionPlano> {
  const conPosicion = lotes.filter(l => l.id != null && l.posicionX != null && l.posicionY != null);
  const maximo = Math.max(0, ...conPosicion.flatMap(l => [Number(l.posicionX), Number(l.posicionY)]));
  const factor = maximo <= 1 ? 100 : 1;

  const mapa = new Map<number, PosicionPlano>();
  for (const l of conPosicion) {
    mapa.set(l.id as number, {
      x: Math.min(100, Math.max(0, Number(l.posicionX) * factor)),
      y: Math.min(100, Math.max(0, Number(l.posicionY) * factor))
    });
  }
  return mapa;
}
