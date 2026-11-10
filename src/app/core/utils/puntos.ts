import { Punto360 } from '../models/punto-360.models';
import { formatoArea } from './lotes';

/** Escapa texto del administrador antes de ponerlo dentro del HTML de un marcador. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML del botón sobre la imagen 360°: la etiqueta y, si apunta a un lote, su área.
 * Todo el texto sale escapado: lo escribe el administrador y se inserta como HTML en el visor.
 */
export function htmlDePin(punto: Pick<Punto360, 'etiqueta' | 'loteAreaM2' | 'loteId' | 'etapaId' | 'zonaComunId'>): string {
  if (esLugarCercano(punto)) {
    // Etiqueta con un palo hacia el suelo, como los rótulos de lugares sobre una vista aérea
    return `<div class="pin-lugar"><span>${escaparHtml(punto.etiqueta)}</span></div>`;
  }
  const area = punto.loteAreaM2 != null ? `<small>${escaparHtml(formatoArea(punto.loteAreaM2))}</small>` : '';
  return `<div class="pin-360"><strong>${escaparHtml(punto.etiqueta)}</strong>${area}</div>`;
}

/** Un botón que no apunta a un lote, una etapa ni una zona es solo un rótulo: un lugar cercano al proyecto (no abre tarjeta). */
export function esLugarCercano(punto: Pick<Punto360, 'loteId' | 'etapaId' | 'zonaComunId'>): boolean {
  return punto.loteId == null && punto.etapaId == null && punto.zonaComunId == null;
}

/** Un punto de una imagen plana (plano o zonas destacadas) se ubica por porcentaje; el resto, por ángulos en la imagen 360°. */
export function esPuntoDePlano(punto: Pick<Punto360, 'escena'>): boolean {
  return punto.escena === 'URBANISMO' || punto.escena === 'ZONAS';
}

/** Nombre mostrado para un lote al elegirlo en el editor: "C21 — 11.448 m²". */
export function tituloDeLote(lote: { codigo: string; areaM2?: number | null }): string {
  const area = formatoArea(lote.areaM2);
  return area ? `${lote.codigo} — ${area}` : lote.codigo;
}
