import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { TURNSTILE_SITE_KEY, TurnstileApi } from '../../../core/services/turnstile.service';
import { CaptchaTurnstileComponent } from './captcha-turnstile.component';

interface Ventana { turnstile?: TurnstileApi }

async function listo(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
}

function montar(clave: string) {
  const callbacks: Record<string, (t?: string) => void> = {};
  const api = {
    render: vi.fn((_el: HTMLElement, op: Record<string, unknown>) => {
      callbacks['exito'] = op['callback'] as (t?: string) => void;
      callbacks['expira'] = op['expired-callback'] as () => void;
      callbacks['error'] = op['error-callback'] as () => void;
      return 'w1';
    }),
    reset: vi.fn(), remove: vi.fn()
  };
  if (clave) (window as unknown as Ventana).turnstile = api as unknown as TurnstileApi;
  TestBed.configureTestingModule({ providers: [provideI18nPruebas(), { provide: TURNSTILE_SITE_KEY, useValue: clave }] });
  const fixture = TestBed.createComponent(CaptchaTurnstileComponent);
  const tokens: (string | null)[] = [];
  fixture.componentInstance.token.subscribe(t => tokens.push(t));
  return { fixture, api, callbacks, tokens, el: fixture.nativeElement as HTMLElement };
}

describe('CaptchaTurnstileComponent', () => {
  afterEach(() => {
    delete (window as unknown as Ventana).turnstile;
    document.getElementById('cf-turnstile-script')?.remove();
  });

  it('sin clave no pinta nada, no carga el script y no emite', async () => {
    const { fixture, el, tokens } = montar('');
    await listo(fixture);
    expect(el.querySelector('.captcha')).toBeNull();
    expect(document.getElementById('cf-turnstile-script')).toBeNull();
    expect(tokens).toEqual([]);
  });

  it('con clave dibuja el widget, avisa que hay que confirmar y tiene región aria-live', async () => {
    const { fixture, api, el } = montar('clave');
    await listo(fixture);
    fixture.detectChanges();
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(el.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('Confirma que no eres un robot');
    expect(api.render.mock.calls[0][1]).toMatchObject({ sitekey: 'clave', language: 'es' });
  });

  it('el callback de éxito emite el token y la expiración lo limpia con aviso', async () => {
    const { fixture, callbacks, tokens, el } = montar('clave');
    await listo(fixture);
    callbacks['exito']('tok-1');
    fixture.detectChanges();
    expect(tokens).toEqual(['tok-1']);
    expect(el.querySelector('.mensaje')?.textContent).toContain('Verificación completada');
    callbacks['expira']();
    fixture.detectChanges();
    expect(tokens).toEqual(['tok-1', null]);
    expect(el.querySelector('.mensaje')?.textContent).toContain('expiró');
  });

  it('un error del widget limpia el token y avisa', async () => {
    const { fixture, callbacks, tokens, el } = montar('clave');
    await listo(fixture);
    callbacks['exito']('tok');
    callbacks['error']();
    fixture.detectChanges();
    expect(tokens).toEqual(['tok', null]);
    expect(el.querySelector('.mensaje')?.textContent).toContain('No se pudo cargar');
  });

  it('resetear borra el token y pide un desafío nuevo al widget', async () => {
    const { fixture, callbacks, tokens, api } = montar('clave');
    await listo(fixture);
    callbacks['exito']('tok');
    fixture.componentInstance.resetear();
    expect(tokens).toEqual(['tok', null]);
    expect(api.reset).toHaveBeenCalledWith('w1');
  });

  it('al destruirse quita el widget', async () => {
    const { fixture, api } = montar('clave');
    await listo(fixture);
    fixture.destroy();
    expect(api.remove).toHaveBeenCalledWith('w1');
  });
});
