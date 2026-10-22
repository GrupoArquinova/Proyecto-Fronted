import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { provideI18nPruebas } from '../../i18n/pruebas';
import { IdiomaService } from '../../core/services/idioma.service';
import { LocalizadoPipe, textoLocalizado } from './localizado.pipe';

describe('textoLocalizado', () => {
  it('con el sitio en inglés usa el texto en inglés si existe; si no, el español', () => {
    expect(textoLocalizado('en', 'Hola', 'Hello')).toBe('Hello');
    expect(textoLocalizado('en', 'Hola', '   ')).toBe('Hola');
    expect(textoLocalizado('en', 'Hola', null)).toBe('Hola');
    expect(textoLocalizado('en', 'Hola')).toBe('Hola');
  });

  it('con el sitio en español siempre usa el español, y tolera valores vacíos', () => {
    expect(textoLocalizado('es', 'Hola', 'Hello')).toBe('Hola');
    expect(textoLocalizado('es', null, 'Hello')).toBe('');
    expect(textoLocalizado('en', undefined, undefined)).toBe('');
  });
});

describe('LocalizadoPipe', () => {
  it('sigue el idioma activo del sitio', async () => {
    TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
    const idioma = TestBed.inject(IdiomaService);
    const pipe = TestBed.runInInjectionContext(() => new LocalizadoPipe());

    expect(pipe.transform('Hola', 'Hello')).toBe('Hola');

    idioma.cambiar('en', false);
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));

    expect(pipe.transform('Hola', 'Hello')).toBe('Hello');
  });
});
