import { describe, it, expect } from 'vitest';
import { textoLocalizado } from './localizado.pipe';

describe('textoLocalizado', () => {
  it('en español siempre muestra el texto en español', () => {
    expect(textoLocalizado('es', 'Hola', 'Hello')).toBe('Hola');
  });

  it('en inglés muestra el texto en inglés cuando existe', () => {
    expect(textoLocalizado('en', 'Hola', 'Hello')).toBe('Hello');
  });

  it('en inglés, sin texto en inglés (vacío, solo espacios o ausente) cae al español', () => {
    expect(textoLocalizado('en', 'Hola', '')).toBe('Hola');
    expect(textoLocalizado('en', 'Hola', '   ')).toBe('Hola');
    expect(textoLocalizado('en', 'Hola', null)).toBe('Hola');
    expect(textoLocalizado('en', 'Hola')).toBe('Hola');
  });

  it('sin texto en español devuelve vacío', () => {
    expect(textoLocalizado('es', null, 'Hello')).toBe('');
    expect(textoLocalizado('en', undefined)).toBe('');
  });
});
