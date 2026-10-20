import { Lote } from '../models/lote.models';

/** Una fila de la tabla "por guardar" del asistente: aún no existe en el servidor. */
export interface FilaLote {
  /** Identificador local (la fila todavía no tiene id del servidor). */
  clave: number;
  etapaId: number;
  codigo: string;
  areaM2: number | null;
  estadoId: number;
  /** Mensaje del último intento fallido de guardar esta fila. */
  error?: string;
}

export interface OpcionesGeneracion {
  etapaId: number;
  prefijo: string;
  desde: number;
  cantidad: number;
  areaM2: number | null;
  estadoId: number;
}

export const MAX_LOTES_POR_TANDA = 200;

/** Genera N filas con códigos consecutivos: LT-01, LT-02, ... (el ancho crece si hace falta: LT-100). */
export function generarFilas(opciones: OpcionesGeneracion, primeraClave: number): FilaLote[] {
  const cantidad = Math.min(Math.max(0, Math.floor(opciones.cantidad)), MAX_LOTES_POR_TANDA);
  const ultimo = opciones.desde + cantidad - 1;
  const ancho = Math.max(2, String(ultimo).length);

  return Array.from({ length: cantidad }, (_, i) => ({
    clave: primeraClave + i,
    etapaId: opciones.etapaId,
    codigo: `${opciones.prefijo}${String(opciones.desde + i).padStart(ancho, '0')}`,
    areaM2: opciones.areaM2,
    estadoId: opciones.estadoId
  }));
}

/**
 * Al cambiar el código de una fila (por ejemplo a LT-100), las filas que le siguen en la misma etapa y con el mismo prefijo
 * continúan la numeración (LT-101, LT-102...). Cada fila se puede volver a editar a mano. Si el código no termina en número
 * no cambia nada. Se conserva el ancho con ceros que escribió la persona (LT-009 → LT-010).
 */
export function renumerarDesde(filas: FilaLote[], clave: number): FilaLote[] {
  const indice = filas.findIndex(f => f.clave === clave);
  if (indice < 0) return filas;
  const base = /^(.*?)(\d{1,9})$/.exec(filas[indice].codigo.trim());
  if (!base) return filas;

  const prefijo = base[1].toLowerCase();
  const ancho = base[2].length;
  let numero = Number(base[2]);
  const etapa = filas[indice].etapaId;

  return filas.map((fila, i) => {
    if (i <= indice || fila.etapaId !== etapa) return fila;
    const propio = /^(.*?)(\d+)$/.exec(fila.codigo.trim());
    if (!propio || propio[1].toLowerCase() !== prefijo) return fila;
    numero++;
    return { ...fila, codigo: `${base[1]}${String(numero).padStart(ancho, '0')}`, error: undefined };
  });
}

/**
 * Siguiente número libre para un prefijo en una etapa, mirando los códigos ya existentes
 * (LT-01..LT-10 → 11), para que una segunda tanda no choque con la primera.
 */
export function proximoNumero(existentes: Pick<Lote, 'codigo' | 'etapaId'>[], etapaId: number, prefijo: string): number {
  const patron = new RegExp(`^${escaparRegex(prefijo)}(\\d+)$`, 'i');
  const usados = existentes
    .filter(l => l.etapaId === etapaId)
    .map(l => patron.exec(l.codigo)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);
  return usados.length ? Math.max(...usados) + 1 : 1;
}

const normalizar = (codigo: string) => codigo.trim().toUpperCase();

/**
 * Claves de las filas cuyo código ya existe en su etapa (guardado antes) o aparece repetido en
 * otra fila de la misma etapa. El backend rechaza (409) un código repetido dentro de una etapa.
 */
export function filasConCodigoRepetido(filas: FilaLote[], existentes: Pick<Lote, 'codigo' | 'etapaId'>[]): Set<number> {
  const guardados = new Set(existentes.map(l => `${l.etapaId}|${normalizar(l.codigo)}`));
  const vistos = new Map<string, number>();
  const repetidas = new Set<number>();

  for (const fila of filas) {
    const llave = `${fila.etapaId}|${normalizar(fila.codigo)}`;
    if (guardados.has(llave) || vistos.has(llave)) {
      repetidas.add(fila.clave);
      const primera = vistos.get(llave);
      if (primera !== undefined) repetidas.add(primera);
    } else {
      vistos.set(llave, fila.clave);
    }
  }
  return repetidas;
}

/** Una fila se puede guardar si tiene código, un área mayor que cero y una etapa. */
export function filaValida(fila: FilaLote): boolean {
  return fila.codigo.trim().length > 0 && fila.codigo.trim().length <= 50
    && fila.areaM2 != null && fila.areaM2 > 0 && fila.etapaId > 0;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
