import { describe, it, expect } from 'vitest';
import en from './en.json';
import es from './es.json';
import { idiomaDelNavegador, esIdioma } from './idiomas';

/** Aplana el JSON a pares "clave.con.puntos" → texto. */
function aplanar(objeto: unknown, prefijo = ''): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(objeto as Record<string, unknown>)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (valor !== null && typeof valor === 'object') Object.assign(salida, aplanar(valor, ruta));
    else salida[ruta] = String(valor);
  }
  return salida;
}

const marcadores = (texto: string) => (texto.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(m => m.replace(/\s/g, '')).sort();

describe('traducciones', () => {
  const textosEs = aplanar(es);
  const textosEn = aplanar(en);

  it('el inglés tiene exactamente las mismas claves que el español', () => {
    const soloEs = Object.keys(textosEs).filter(k => !(k in textosEn));
    const soloEn = Object.keys(textosEn).filter(k => !(k in textosEs));
    expect(soloEs, 'claves sin traducir al inglés').toEqual([]);
    expect(soloEn, 'claves que sobran en inglés').toEqual([]);
  });

  it('ningún texto está vacío', () => {
    const vacios = [...Object.entries(textosEs), ...Object.entries(textosEn)].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(vacios).toEqual([]);
  });

  it('los marcadores {{nombre}} son los mismos en los dos idiomas', () => {
    const distintos = Object.keys(textosEs).filter(k => k in textosEn
      && JSON.stringify(marcadores(textosEs[k])) !== JSON.stringify(marcadores(textosEn[k])));
    expect(distintos).toEqual([]);
  });
});

describe('idioma del navegador', () => {
  it('el inglés en cualquiera de sus variantes da inglés', () => {
    expect(idiomaDelNavegador('en')).toBe('en');
    expect(idiomaDelNavegador('en-US')).toBe('en');
    expect(idiomaDelNavegador('EN-gb')).toBe('en');
  });

  it('cualquier otro idioma, o ninguno, da español', () => {
    expect(idiomaDelNavegador('es-CO')).toBe('es');
    expect(idiomaDelNavegador('fr')).toBe('es');
    expect(idiomaDelNavegador('')).toBe('es');
    expect(idiomaDelNavegador(undefined)).toBe('es');
  });

  it('solo reconoce los idiomas del sitio', () => {
    expect(esIdioma('es')).toBe(true);
    expect(esIdioma('en')).toBe(true);
    expect(esIdioma('fr')).toBe(false);
    expect(esIdioma(null)).toBe(false);
  });
});
