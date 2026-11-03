import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnaliticaService } from './analitica.service';
import { environment } from '../../../environments/environment';

const URL_EVENTO = `${environment.apiUrl}/analitica/evento`;

describe('AnaliticaService', () => {
  let fetchSimulado: ReturnType<typeof vi.fn>;

  function crear(plataforma = 'browser') {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: PLATFORM_ID, useValue: plataforma }]
    });
    return { servicio: TestBed.inject(AnaliticaService), router: TestBed.inject(Router) };
  }

  const cuerpos = () => fetchSimulado.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string));
  const definirNavegador = (clave: string, valor: unknown) => Object.defineProperty(navigator, clave, { value: valor, configurable: true });
  const quitarNavegador = (clave: string) => { delete (navigator as unknown as Record<string, unknown>)[clave]; };

  beforeEach(() => {
    fetchSimulado = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchSimulado);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    quitarNavegador('doNotTrack');
    quitarNavegador('globalPrivacyControl');
  });

  it('envía una vista de página por navegación, con la ruta sin querystring ni fragmento', async () => {
    const { servicio, router } = crear();
    servicio.iniciar();
    await router.navigateByUrl('/proyectos?tipo=rural#filtros');

    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL_EVENTO);
    expect(opciones.method).toBe('POST');
    expect(cuerpos()[0]).toEqual({ tipo: 'VISTA_PAGINA', ruta: '/proyectos' });
  });

  it('no usa cookies ni credenciales ni referrer ni lleva identificadores', async () => {
    const { servicio, router } = crear();
    servicio.iniciar();
    await router.navigateByUrl('/proyectos');

    const opciones = fetchSimulado.mock.calls[0][1] as RequestInit;
    expect(opciones.credentials).toBe('omit');
    expect(opciones.referrerPolicy).toBe('no-referrer');
    expect(Object.keys(opciones.headers as Record<string, string>)).toEqual(['Content-Type']);
    expect(Object.keys(cuerpos()[0]).sort()).toEqual(['ruta', 'tipo']);
  });

  it('las páginas de un proyecto llevan su id', async () => {
    const { servicio, router } = crear();
    servicio.iniciar();
    await router.navigateByUrl('/proyectos/6/lotes?vista=plano');
    expect(cuerpos()[0]).toEqual({ tipo: 'VISTA_PAGINA', ruta: '/proyectos/6/lotes', proyectoId: 6 });
  });

  it('cambiar solo el querystring de la misma página no cuenta otra vista, pero otra página sí', async () => {
    const { servicio, router } = crear();
    servicio.iniciar();
    await router.navigateByUrl('/proyectos/6/ubicacion?vista=mapa');
    await router.navigateByUrl('/proyectos/6/ubicacion?vista=aerea');
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    await router.navigateByUrl('/proyectos/6/contacto');
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });

  it('iniciar() dos veces no duplica el conteo', async () => {
    const { servicio, router } = crear();
    servicio.iniciar();
    servicio.iniciar();
    await router.navigateByUrl('/proyectos');
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('no envía nada desde el panel de administración ni desde el acceso', async () => {
    const { servicio, router } = crear();
    servicio.iniciar();
    for (const ruta of ['/admin/resumen', '/admin', '/login', '/recuperar-password', '/reset-password?token=abc']) {
      await router.navigateByUrl(ruta);
    }
    servicio.clickWhatsapp();
    servicio.compartir(3);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  describe('No rastrear', () => {
    it('con Do Not Track activo no envía ningún evento', async () => {
      definirNavegador('doNotTrack', '1');
      const { servicio, router } = crear();
      servicio.iniciar();
      await router.navigateByUrl('/proyectos/6/bienvenida');
      servicio.vistaProyecto(6);
      servicio.clickWhatsapp(6);
      servicio.compartir(6);
      expect(fetchSimulado).not.toHaveBeenCalled();
    });

    it('con Global Privacy Control activo tampoco envía', async () => {
      definirNavegador('globalPrivacyControl', true);
      const { servicio, router } = crear();
      servicio.iniciar();
      await router.navigateByUrl('/proyectos');
      expect(fetchSimulado).not.toHaveBeenCalled();
    });

    it('con Do Not Track en "0" o sin definir sí envía', async () => {
      definirNavegador('doNotTrack', '0');
      const { servicio, router } = crear();
      servicio.iniciar();
      await router.navigateByUrl('/proyectos');
      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });
  });

  describe('eventos puntuales', () => {
    it('VISTA_PROYECTO lleva el id del proyecto', async () => {
      const { servicio, router } = crear();
      await router.navigateByUrl('/proyectos/6/bienvenida');
      servicio.vistaProyecto(6);
      expect(cuerpos()[0]).toEqual({ tipo: 'VISTA_PROYECTO', proyectoId: 6, ruta: '/proyectos/6/bienvenida' });
    });

    it('CLICK_WHATSAPP usa el proyecto indicado, o el de la página, o ninguno', async () => {
      const { servicio, router } = crear();
      await router.navigateByUrl('/');
      servicio.clickWhatsapp();
      servicio.clickWhatsapp(4);
      await router.navigateByUrl('/proyectos/9/contacto');
      servicio.clickWhatsapp();
      expect(cuerpos()).toEqual([
        { tipo: 'CLICK_WHATSAPP', ruta: '/' },
        { tipo: 'CLICK_WHATSAPP', ruta: '/', proyectoId: 4 },
        { tipo: 'CLICK_WHATSAPP', ruta: '/proyectos/9/contacto', proyectoId: 9 },
      ]);
    });

    it('COMPARTIR lleva el proyecto', async () => {
      const { servicio, router } = crear();
      await router.navigateByUrl('/proyectos');
      servicio.compartir(6);
      expect(cuerpos()[0]).toEqual({ tipo: 'COMPARTIR', proyectoId: 6, ruta: '/proyectos' });
    });

    it('nunca envía los tipos que registra el servidor', () => {
      const { servicio } = crear();
      const prototipo = Object.getOwnPropertyNames(AnaliticaService.prototype);
      for (const metodo of prototipo) expect(metodo).not.toMatch(/formulario|chat|brochure|descarga/i);
      expect(servicio).toBeTruthy();
    });
  });

  describe('fallos silenciosos', () => {
    it('si el envío falla (sin red, backend caído) no lanza ni deja una promesa rechazada', async () => {
      fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
      const { servicio, router } = crear();
      await router.navigateByUrl('/proyectos');
      expect(() => servicio.clickWhatsapp()).not.toThrow();
      await Promise.resolve();
    });

    it('si fetch lanza de forma síncrona o no existe, tampoco rompe la página', async () => {
      fetchSimulado.mockImplementation(() => { throw new Error('boom'); });
      const { servicio, router } = crear();
      await router.navigateByUrl('/proyectos');
      expect(() => servicio.compartir(1)).not.toThrow();

      vi.stubGlobal('fetch', undefined);
      expect(() => servicio.compartir(1)).not.toThrow();
    });
  });

  it('en el servidor (SSR) no envía nada', async () => {
    const { servicio, router } = crear('server');
    servicio.iniciar();
    await router.navigateByUrl('/proyectos');
    servicio.vistaProyecto(1);
    servicio.clickWhatsapp(1);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});
