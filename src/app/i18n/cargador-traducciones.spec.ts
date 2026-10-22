import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CargadorTraducciones } from './cargador-traducciones';
import en from './en.json';
import es from './es.json';

describe('CargadorTraducciones', () => {
  const cargador = () => TestBed.inject(CargadorTraducciones);

  it('carga las traducciones en español', async () => {
    const t = await firstValueFrom(cargador().getTranslation('es'));

    expect(t).toEqual(es);
  });

  it('carga las traducciones en inglés', async () => {
    const t = await firstValueFrom(cargador().getTranslation('en'));

    expect(t).toEqual(en);
  });

  it('un idioma desconocido cae en español', async () => {
    const t = await firstValueFrom(cargador().getTranslation('fr'));

    expect(t).toEqual(es);
  });
});
