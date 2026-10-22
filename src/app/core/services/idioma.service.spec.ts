import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAVE_IDIOMA } from '../../i18n/idiomas';
import { provideI18nPruebas } from '../../i18n/pruebas';
import { IDIOMA_DEL_NAVEGADOR, IdiomaService } from './idioma.service';

function crear(idiomaNavegador = 'es-CO', plataforma?: string): IdiomaService {
  TestBed.configureTestingModule({
    providers: [provideI18nPruebas(idiomaNavegador), ...(plataforma ? [{ provide: PLATFORM_ID, useValue: plataforma }] : [])],
  });
  const servicio = TestBed.inject(IdiomaService);
  TestBed.inject(ApplicationRef).tick(); // dispara el afterNextRender del constructor
  return servicio;
}

describe('IdiomaService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin preferencia guardada y con navegador en español arranca en español', () => {
    const servicio = crear('es-CO');

    expect(servicio.idioma()).toBe('es');
    expect(servicio.esIngles()).toBe(false);
  });

  it('sin preferencia guardada usa el idioma del navegador cuando es inglés', async () => {
    const servicio = crear('en-US');

    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));
    expect(servicio.esIngles()).toBe(true);
    expect(document.documentElement.lang).toBe('en');
    // lo que viene del navegador no se guarda como elección de la persona
    expect(localStorage.getItem(CLAVE_IDIOMA)).toBeNull();
  });

  it('un idioma de navegador distinto al inglés deja el sitio en español', () => {
    expect(crear('fr-FR').idioma()).toBe('es');
  });

  it('el idioma guardado en localStorage gana sobre el del navegador', async () => {
    localStorage.setItem(CLAVE_IDIOMA, 'en');

    const servicio = crear('es-CO');

    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));
  });

  it('un valor guardado que no es un idioma válido se ignora', () => {
    localStorage.setItem(CLAVE_IDIOMA, 'klingon');

    const servicio = crear('es-CO');

    expect(servicio.idioma()).toBe('es');
  });

  it('cambiar recuerda por defecto la elección y actualiza <html lang>', async () => {
    const servicio = crear('es-CO');

    servicio.cambiar('en');

    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));
    expect(localStorage.getItem(CLAVE_IDIOMA)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');

    servicio.cambiar('es');
    await vi.waitFor(() => expect(servicio.idioma()).toBe('es'));
    expect(document.documentElement.lang).toBe('es');
    expect(servicio.esIngles()).toBe(false);
  });

  it('cambiar sin recordar no escribe en localStorage', async () => {
    const servicio = crear('es-CO');

    servicio.cambiar('en', false);

    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));
    expect(localStorage.getItem(CLAVE_IDIOMA)).toBeNull();
  });

  it('si el idioma no se puede cargar se queda como estaba', async () => {
    const servicio = crear('es-CO');
    const transloco = TestBed.inject(TranslocoService);
    vi.spyOn(transloco, 'load').mockReturnValue(throwError(() => new Error('sin red')));

    servicio.cambiar('en');
    await Promise.resolve();

    expect(servicio.idioma()).toBe('es');
    expect(document.documentElement.lang).not.toBe('en');
  });

  it('con el almacenamiento bloqueado no falla: usa el navegador y el cambio sigue funcionando', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });

    const servicio = crear('en-GB');
    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));

    servicio.cambiar('es');
    await vi.waitFor(() => expect(servicio.idioma()).toBe('es'));
  });

  it('en el servidor no toca el almacenamiento ni cambia el idioma al iniciar', () => {
    localStorage.setItem(CLAVE_IDIOMA, 'en');

    const servicio = crear('en-US', 'server');

    expect(servicio.idioma()).toBe('es');
  });

  it('t() traduce con parámetros y sigue el idioma activo', async () => {
    const servicio = crear('es-CO');

    expect(servicio.t('home.destacado.whatsapp', { nombre: 'El Encanto' })).toContain('El Encanto');
    expect(servicio.t('home.destacado.whatsapp', { nombre: 'El Encanto' })).toContain('Hola, estoy interesado');

    servicio.cambiar('en');
    await vi.waitFor(() => expect(servicio.idioma()).toBe('en'));

    expect(servicio.t('home.destacado.whatsapp', { nombre: 'El Encanto' })).toContain('Hello, I am interested in El Encanto');
  });

  it('IDIOMA_DEL_NAVEGADOR por defecto toma navigator.language', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(IDIOMA_DEL_NAVEGADOR)).toBe(navigator.language);
  });
});
