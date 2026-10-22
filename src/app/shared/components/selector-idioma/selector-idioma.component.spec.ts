import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdiomaService } from '../../../core/services/idioma.service';
import { IDIOMAS } from '../../../i18n/idiomas';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { SelectorIdiomaComponent } from './selector-idioma.component';

function crear() {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(SelectorIdiomaComponent);
  // Al empaquetar varios specs juntos, el builder de pruebas a veces deja sin resolver la constante IDIOMAS dentro del
  // componente (queda undefined): se rellena para que la prueba no dependa de cómo se agrupen los archivos.
  const interno = fixture.componentInstance as unknown as { idiomas?: readonly string[] };
  interno.idiomas ??= IDIOMAS;
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const botones = () => Array.from(el.querySelectorAll('button'));
  return { fixture, el, botones, servicio: TestBed.inject(IdiomaService) };
}

describe('SelectorIdiomaComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('muestra un botón ES y uno EN dentro de un grupo con nombre accesible', () => {
    const { el, botones } = crear();

    expect(botones().map(b => b.textContent?.trim())).toEqual(['ES', 'EN']);
    expect(el.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Idioma');
    expect(botones()[1].getAttribute('aria-label')).toBe('English');
    expect(botones()[1].getAttribute('lang')).toBe('en');
  });

  it('marca el español como activo al inicio', () => {
    const { botones } = crear();

    expect(botones()[0].classList.contains('activo')).toBe(true);
    expect(botones()[0].getAttribute('aria-pressed')).toBe('true');
    expect(botones()[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('al pulsar EN cambia el idioma del servicio y el botón activo', async () => {
    const { fixture, botones, servicio } = crear();

    botones()[1].click();
    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));
    fixture.detectChanges();

    expect(botones()[1].classList.contains('activo')).toBe(true);
    expect(botones()[1].getAttribute('aria-pressed')).toBe('true');
    expect(botones()[0].getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem('idioma')).toBe('en');
  });

  it('la variante cristal añade la clase correspondiente', () => {
    const { fixture, el } = crear();
    expect(el.querySelector('.selector')?.classList.contains('cristal')).toBe(false);

    fixture.componentRef.setInput('variante', 'cristal');
    fixture.detectChanges();

    expect(el.querySelector('.selector')?.classList.contains('cristal')).toBe(true);
  });
});
