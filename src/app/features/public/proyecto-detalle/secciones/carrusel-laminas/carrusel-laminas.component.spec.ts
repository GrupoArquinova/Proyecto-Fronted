import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { CarruselLaminasComponent, Lamina } from './carrusel-laminas.component';

const laminas: Lamina[] = [
  { id: 1, url: 'https://img.test/a.jpg', titulo: 'Fachada' },
  { id: 2, url: 'https://img.test/b.jpg' },
  { id: 3, url: 'https://img.test/c.jpg', titulo: 'Sala' },
];

function crear(entradas: Record<string, unknown> = {}, lista: Lamina[] = laminas) {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(CarruselLaminasComponent);
  fixture.componentRef.setInput('laminas', lista);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const c = fixture.componentInstance;
  const refrescar = () => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  return { fixture, el, c, refrescar, imagen: () => el.querySelector<HTMLImageElement>('.imagen img')?.getAttribute('src') };
}

describe('CarruselLaminasComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra la primera lámina y las miniaturas', () => {
    const { el, imagen } = crear();

    expect(imagen()).toBe('https://img.test/a.jpg');
    expect(el.querySelectorAll('.miniaturas li').length).toBe(3);
    expect(el.querySelector('.pista')).not.toBeNull();
  });

  it('sin láminas no dibuja nada', () => {
    const { el } = crear({}, []);
    expect(el.querySelector('.carrusel')).toBeNull();
  });

  it('con una sola lámina no hay flechas, miniaturas ni pista, y los clics no la cambian', () => {
    const { el, c } = crear({}, [laminas[0]]);

    expect(el.querySelector('.barra')).toBeNull();
    expect(el.querySelector('.pista')).toBeNull();
    c.clicEnImagen({ currentTarget: el.querySelector('.imagen'), clientX: 5 } as unknown as MouseEvent);
    c.siguiente();
    c.anterior();
    expect(c.indiceActual()).toBe(0);
  });

  it('las flechas avanzan y retroceden dando la vuelta, y quitan la pista', () => {
    const { el, c, fixture, imagen } = crear();

    el.querySelectorAll<HTMLButtonElement>('.flecha')[1].click();
    fixture.detectChanges();
    expect(imagen()).toBe('https://img.test/b.jpg');
    expect(c.pista()).toBe(false);

    el.querySelectorAll<HTMLButtonElement>('.flecha')[0].click();
    el.querySelectorAll<HTMLButtonElement>('.flecha')[0].click();
    fixture.detectChanges();
    expect(imagen()).toBe('https://img.test/c.jpg'); // de la primera, hacia atrás: da la vuelta a la última
  });

  it('al llegar a la última, siguiente vuelve a la primera', () => {
    const { c } = crear();
    c.irA(2);
    c.siguiente();
    expect(c.indiceActual()).toBe(0);
  });

  it('las miniaturas llevan directo a esa lámina', () => {
    const { el, fixture, imagen } = crear();

    el.querySelectorAll<HTMLButtonElement>('.miniaturas button')[2].click();
    fixture.detectChanges();

    expect(imagen()).toBe('https://img.test/c.jpg');
    expect(el.querySelectorAll('.miniaturas button')[2].getAttribute('aria-current')).toBe('true');
  });

  it('un clic en la mitad izquierda de la imagen retrocede y en la derecha avanza', () => {
    const { c } = crear();
    const caja = { getBoundingClientRect: () => ({ left: 100, width: 400 }) };

    c.clicEnImagen({ currentTarget: caja, clientX: 450 } as unknown as MouseEvent);
    expect(c.indiceActual()).toBe(1);
    c.clicEnImagen({ currentTarget: caja, clientX: 120 } as unknown as MouseEvent);
    expect(c.indiceActual()).toBe(0);
  });

  it('deslizar el dedo cambia de lámina solo si el movimiento es largo', () => {
    const { c } = crear();
    const toque = (x: number) => ({ touches: [{ clientX: x }], changedTouches: [{ clientX: x }], preventDefault: vi.fn() }) as unknown as TouchEvent;

    c.inicioToque(toque(300));
    c.finToque(toque(200)); // hacia la izquierda: siguiente
    expect(c.indiceActual()).toBe(1);

    c.inicioToque(toque(200));
    c.finToque(toque(330)); // hacia la derecha: anterior
    expect(c.indiceActual()).toBe(0);

    c.inicioToque(toque(200));
    c.finToque(toque(220)); // movimiento corto: no cambia
    expect(c.indiceActual()).toBe(0);

    c.finToque(toque(10)); // sin toque de inicio: no hace nada
    expect(c.indiceActual()).toBe(0);
  });

  it('las teclas ← y → mueven el carrusel', () => {
    const { c } = crear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(c.indiceActual()).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(c.indiceActual()).toBe(0);
  });

  it('la flecha de abajo esconde y vuelve a mostrar la tira de miniaturas', () => {
    const { el, fixture, c } = crear();

    el.querySelector<HTMLButtonElement>('.ver-miniaturas')?.click();
    fixture.detectChanges();
    expect(c.miniaturasVisibles()).toBe(false);
    expect(el.querySelector('.miniaturas')).toBeNull();
    expect(el.querySelector('.espacio')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('.ver-miniaturas')?.click();
    fixture.detectChanges();
    expect(el.querySelector('.miniaturas')).not.toBeNull();
  });

  it('en un marco las miniaturas aparecen 2 segundos al cambiar de imagen y luego se esconden; si la persona las escondió, no vuelven solas', () => {
    const { c, fixture } = crear({ enMarco: true });
    fixture.detectChanges();
    expect(c.miniaturasVisibles()).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(c.miniaturasVisibles()).toBe(false);

    c.siguiente();
    fixture.detectChanges();
    expect(c.miniaturasVisibles()).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(c.miniaturasVisibles()).toBe(false);

    c.alternarMiniaturas(); // las muestra
    c.alternarMiniaturas(); // la persona las esconde
    c.siguiente();
    fixture.detectChanges();
    expect(c.miniaturasVisibles()).toBe(false);
  });

  it('muestra la leyenda con el título de la lámina cuando se pide', () => {
    const { el } = crear({ leyenda: true });
    expect(el.querySelector('.leyenda')?.textContent).toContain('Fachada');
  });

  it('con el botón de ampliar usa la pantalla completa del navegador y sale con el mismo botón', async () => {
    const { el, fixture, c } = crear({ ampliable: true });
    const host = fixture.nativeElement as unknown as HTMLElement & { requestFullscreen?: () => Promise<void> };
    host.requestFullscreen = vi.fn(() => Promise.resolve());
    const salir = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenElement', { value: host, configurable: true });
    document.exitFullscreen = salir;

    el.querySelector<HTMLButtonElement>('.ampliar')?.click();
    await Promise.resolve();
    fixture.detectChanges();
    expect(c.ampliada()).toBe(true);
    expect(host.requestFullscreen).toHaveBeenCalled();
    expect(host.classList.contains('ampliada')).toBe(true);

    el.querySelector<HTMLButtonElement>('.ampliar')?.click();
    fixture.detectChanges();
    expect(c.ampliada()).toBe(false);
    expect(salir).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
  });

  it('si el navegador sale de pantalla completa (Esc) se quita la ampliación', async () => {
    const { fixture, c } = crear({ ampliable: true });
    const host = fixture.nativeElement as unknown as HTMLElement & { requestFullscreen?: () => Promise<void> };
    host.requestFullscreen = vi.fn(() => Promise.resolve());
    c.alternarAmpliada();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.ampliada()).toBe(true);

    document.dispatchEvent(new Event('fullscreenchange'));

    expect(c.ampliada()).toBe(false);
  });

  it('sin pantalla completa del navegador (iPhone) la ampliación es una capa fija y Escape la cierra', () => {
    const { fixture, c } = crear({ ampliable: true });
    (fixture.nativeElement as unknown as { requestFullscreen?: unknown }).requestFullscreen = undefined;

    c.alternarAmpliada();
    expect(c.ampliada()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(c.ampliada()).toBe(false);
  });

  it('si el navegador rechaza la pantalla completa, la ampliación sigue como capa fija', async () => {
    const { fixture, c } = crear({ ampliable: true });
    (fixture.nativeElement as unknown as { requestFullscreen?: () => Promise<void> }).requestFullscreen = () => Promise.reject(new Error('no'));

    c.alternarAmpliada();
    await Promise.resolve();
    await Promise.resolve();

    expect(c.ampliada()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(c.ampliada()).toBe(false);
  });

  it('al destruirse cancela el temporizador pendiente', () => {
    const { fixture } = crear({ enMarco: true });
    const limpiar = vi.spyOn(globalThis, 'clearTimeout');

    fixture.destroy();

    expect(limpiar).toHaveBeenCalled();
  });
});
