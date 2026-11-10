import { describe, expect, it } from 'vitest';
import { EMPRESA_LEGAL, partesDeTexto } from './legal.config';

describe('partesDeTexto', () => {
  it('un texto sin campos vuelve igual, en una sola parte', () => {
    expect(partesDeTexto('Texto simple')).toEqual([{ texto: 'Texto simple', pendiente: false }]);
  });

  it('un texto vacío no genera partes', () => {
    expect(partesDeTexto('')).toEqual([]);
  });

  it('reemplaza un campo con dato y conserva el texto de alrededor', () => {
    expect(partesDeTexto('NIT {{nit}} registrado')).toEqual([
      { texto: 'NIT ', pendiente: false },
      { texto: EMPRESA_LEGAL['nit'], pendiente: false },
      { texto: ' registrado', pendiente: false },
    ]);
  });

  it('un campo vacío se marca como pendiente con su nombre legible', () => {
    expect(partesDeTexto('{{direccion}}')).toEqual([{ texto: '[por completar: dirección]', pendiente: true }]);
  });

  it('un campo que no existe se marca pendiente con su propio nombre', () => {
    expect(partesDeTexto('{{inventado}}')).toEqual([{ texto: '[por completar: inventado]', pendiente: true }]);
  });

  it('procesa varios campos seguidos', () => {
    const partes = partesDeTexto('{{razonSocial}}{{sitioWeb}} fin');

    expect(partes.map(p => p.pendiente)).toEqual([false, true, false]);
    expect(partes[1].texto).toBe('[por completar: sitio web]');
  });

  it('en inglés usa la fecha traducida y los avisos en inglés', () => {
    expect(partesDeTexto('{{fechaVigencia}}', 'en')).toEqual([{ texto: 'October 7, 2026', pendiente: false }]);
    expect(partesDeTexto('{{areaResponsable}}', 'en')[0].texto)
      .toBe('[to be completed: department or person responsible for personal data]');
    expect(partesDeTexto('{{inventado}}', 'en')[0].texto).toBe('[to be completed: inventado]');
  });

  it('en español la fecha sale en español', () => {
    expect(partesDeTexto('{{fechaVigencia}}', 'es')[0].texto).toBe('7 de octubre de 2026');
  });
});
