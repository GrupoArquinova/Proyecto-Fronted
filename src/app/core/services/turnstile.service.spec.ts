import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TURNSTILE_SITE_KEY, TurnstileApi, TurnstileService } from './turnstile.service';

interface Ventana { turnstile?: TurnstileApi }
const ventana = () => window as unknown as Ventana;
const scripts = () => document.head.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]');

function crear(clave: string) {
  TestBed.configureTestingModule({ providers: [{ provide: TURNSTILE_SITE_KEY, useValue: clave }] });
  return TestBed.inject(TurnstileService);
}

function apiFalsa() {
  const api = { render: vi.fn(() => 'w1'), reset: vi.fn(), remove: vi.fn() };
  ventana().turnstile = api;
  return api;
}

describe('TurnstileService', () => {
  afterEach(() => {
    delete ventana().turnstile;
    document.getElementById('cf-turnstile-script')?.remove();
  });

  it('sin clave no está activo y no carga ningún script', async () => {
    const s = crear('');
    expect(s.activo).toBe(false);
    expect(await s.cargarScript()).toBeNull();
    expect(scripts().length).toBe(0);
  });

  it('una clave solo con espacios cuenta como vacía', () => {
    expect(crear('   ').activo).toBe(false);
  });

  it('con clave descarga el script una sola vez, con render=explicit, y resuelve la API al cargar', async () => {
    const s = crear('1x00000000000000000000AA');
    expect(s.activo).toBe(true);
    const a = s.cargarScript();
    const b = s.cargarScript();
    expect(scripts().length).toBe(1);
    expect(scripts()[0].getAttribute('src')).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    const api = apiFalsa();
    scripts()[0].dispatchEvent(new Event('load'));
    expect(await a).toBe(api);
    expect(await b).toBe(api);
    expect(scripts().length).toBe(1);
  });

  it('si el script ya está disponible no vuelve a descargarlo', async () => {
    const api = apiFalsa();
    expect(await crear('k').cargarScript()).toBe(api);
    expect(scripts().length).toBe(0);
  });

  it('si la descarga falla resuelve null y permite reintentar', async () => {
    const s = crear('k');
    const intento = s.cargarScript();
    scripts()[0].dispatchEvent(new Event('error'));
    expect(await intento).toBeNull();
    expect(scripts().length).toBe(0);
    s.cargarScript();
    expect(scripts().length).toBe(1);
  });

  it('renderiza el widget explícito con tema claro, tamaño normal, idioma y callbacks', async () => {
    const api = apiFalsa();
    const s = crear('clave-sitio');
    const contenedor = document.createElement('div');
    const cb = { exito: vi.fn(), expira: vi.fn(), error: vi.fn() };
    expect(await s.renderizar(contenedor, cb, { idioma: 'en' })).toBe('w1');
    const [el, op] = api.render.mock.calls[0] as unknown as [HTMLElement, Record<string, unknown>];
    expect(el).toBe(contenedor);
    expect(op).toMatchObject({ sitekey: 'clave-sitio', theme: 'light', size: 'normal', language: 'en' });
    (op['callback'] as (t: string) => void)('tok');
    (op['expired-callback'] as () => void)();
    (op['error-callback'] as () => void)();
    expect(cb.exito).toHaveBeenCalledWith('tok');
    expect(cb.expira).toHaveBeenCalled();
    expect(cb.error).toHaveBeenCalled();
  });

  it('si el script no carga, avisa el error y no renderiza', async () => {
    const s = crear('k');
    const cb = { exito: vi.fn(), expira: vi.fn(), error: vi.fn() };
    const r = s.renderizar(document.createElement('div'), cb, { idioma: 'es' });
    scripts()[0].dispatchEvent(new Event('error'));
    expect(await r).toBeNull();
    expect(cb.error).toHaveBeenCalled();
  });

  it('resetear y quitar llaman a la API y toleran id nulo o fallos', () => {
    const api = apiFalsa();
    const s = crear('k');
    s.resetear('w1'); s.quitar('w1'); s.resetear(null); s.quitar(null);
    expect(api.reset).toHaveBeenCalledWith('w1');
    expect(api.remove).toHaveBeenCalledWith('w1');
    expect(api.reset).toHaveBeenCalledTimes(1);
    api.reset.mockImplementation(() => { throw new Error('x'); });
    expect(() => s.resetear('w1')).not.toThrow();
  });
});
