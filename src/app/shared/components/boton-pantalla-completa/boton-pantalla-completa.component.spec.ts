import { PLATFORM_ID } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { BotonPantallaCompletaComponent } from './boton-pantalla-completa.component';

const raiz = document.documentElement as unknown as { requestFullscreen?: () => Promise<void> };
const original = raiz.requestFullscreen;

function crear(plataforma?: string) {
  TestBed.configureTestingModule({
    providers: [provideI18nPruebas(), ...(plataforma ? [{ provide: PLATFORM_ID, useValue: plataforma }] : [])],
  });
  const fixture = TestBed.createComponent(BotonPantallaCompletaComponent);
  fixture.detectChanges();
  TestBed.inject(ApplicationRef).tick();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function fijarFullscreenElement(valor: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => valor });
}

describe('BotonPantallaCompletaComponent', () => {
  beforeEach(() => document.body.classList.remove('con-pantalla-completa'));

  afterEach(() => {
    raiz.requestFullscreen = original;
    fijarFullscreenElement(null);
    vi.restoreAllMocks();
  });

  it('si el navegador no permite pantalla completa (iPhone) no muestra el botón', () => {
    raiz.requestFullscreen = undefined;

    const { el } = crear();

    expect(el.querySelector('button')).toBeNull();
    expect(document.body.classList.contains('con-pantalla-completa')).toBe(false);
  });

  it('si la permite muestra el botón y marca la página con la clase para subir WhatsApp', () => {
    raiz.requestFullscreen = vi.fn().mockResolvedValue(undefined);

    const { el } = crear();

    const boton = el.querySelector('button');
    expect(boton?.getAttribute('aria-label')).toBe('Pantalla completa');
    expect(document.body.classList.contains('con-pantalla-completa')).toBe(true);
  });

  it('al pulsar pide pantalla completa de toda la página', () => {
    const pedir = vi.fn().mockResolvedValue(undefined);
    raiz.requestFullscreen = pedir;
    const { el } = crear();

    el.querySelector('button')!.click();

    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('estando en pantalla completa, pulsar la cierra y el botón ofrece salir', () => {
    raiz.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const salir = vi.fn().mockResolvedValue(undefined);
    (document as unknown as { exitFullscreen: () => Promise<void> }).exitFullscreen = salir;
    const { fixture, el } = crear();

    fijarFullscreenElement(document.body);
    document.dispatchEvent(new Event('fullscreenchange'));
    fixture.detectChanges();

    expect(fixture.componentInstance.activa()).toBe(true);
    expect(el.querySelector('button')?.getAttribute('aria-label')).toBe('Salir de pantalla completa');

    el.querySelector('button')!.click();
    expect(salir).toHaveBeenCalledTimes(1);

    fijarFullscreenElement(null);
    document.dispatchEvent(new Event('fullscreenchange'));
    fixture.detectChanges();
    expect(fixture.componentInstance.activa()).toBe(false);
    expect(el.querySelector('button')?.getAttribute('aria-label')).toBe('Pantalla completa');
  });

  it('si el navegador rechaza la pantalla completa no hay error sin controlar', async () => {
    raiz.requestFullscreen = vi.fn().mockRejectedValue(new Error('denegado'));
    const { fixture } = crear();

    expect(() => fixture.componentInstance.alternar()).not.toThrow();
    await Promise.resolve();
  });

  it('al destruirse quita la clase de la página', () => {
    raiz.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const { fixture } = crear();
    expect(document.body.classList.contains('con-pantalla-completa')).toBe(true);

    fixture.destroy();

    expect(document.body.classList.contains('con-pantalla-completa')).toBe(false);
  });

  it('en el servidor no muestra nada', () => {
    raiz.requestFullscreen = vi.fn().mockResolvedValue(undefined);

    const { el } = crear('server');

    expect(el.querySelector('button')).toBeNull();
  });
});
