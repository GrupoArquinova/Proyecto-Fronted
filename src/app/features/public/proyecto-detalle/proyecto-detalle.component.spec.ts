import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProyectoDetalleComponent } from './proyecto-detalle.component';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { UbicacionService } from '../../../core/services/ubicacion.service';
import { ZonaComunService } from '../../../core/services/zona-comun.service';
import { CasaModeloService } from '../../../core/services/casa-modelo.service';
import { LoteService } from '../../../core/services/lote.service';
import { MultimediaService } from '../../../core/services/multimedia.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { Punto360Service } from '../../../core/services/punto-360.service';
import { SeoService } from '../../../core/services/seo.service';
import { IdiomaService } from '../../../core/services/idioma.service';
import { provideI18nPruebas } from '../../../i18n/pruebas';

@Component({ selector: 'app-prueba-hija', standalone: true, template: '<p class="hija">hija</p>' })
class Hija {}

const raiz = document.documentElement as unknown as { requestFullscreen?: () => Promise<void> };
const fullscreenOriginal = raiz.requestFullscreen;

interface Datos {
  proyecto?: unknown;
  ubicacion?: unknown;
  multimedia?: unknown[];
  lotes?: unknown[];
}

function montar(datos: Datos = {}) {
  const proyecto$ = datos.proyecto === undefined
    ? of({ id: 7, empresaId: 1, nombre: 'La Hacienda', descripcion: 'Un proyecto campestre', imagenUrl: 'https://x.com/p.jpg' })
    : datos.proyecto;
  const proyectos = { getProyectoPorId: vi.fn(() => proyecto$) };
  const seo = { establecer: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{
        path: 'proyectos/:id',
        component: ProyectoDetalleComponent,
        children: [{ path: '', component: Hija }, { path: ':seccion', component: Hija }]
      }, { path: 'proyectos', component: Hija }]),
      provideI18nPruebas(),
      { provide: ProyectoService, useValue: proyectos },
      { provide: UbicacionService, useValue: { obtenerPorProyecto: vi.fn(() => of(datos.ubicacion ?? null)) } },
      { provide: ZonaComunService, useValue: { listarPublicasPorProyecto: vi.fn(() => of([])) } },
      { provide: CasaModeloService, useValue: { listarPublicasPorProyecto: vi.fn(() => of([])) } },
      { provide: LoteService, useValue: { obtenerLotesPublicos: vi.fn(() => of(datos.lotes ?? [])) } },
      { provide: MultimediaService, useValue: { listarPublicadosPorEntidad: vi.fn(() => of(datos.multimedia ?? [])) } },
      { provide: ContenidoService, useValue: { obtenerPublicadosPorEmpresa: vi.fn(() => of([])) } },
      { provide: Punto360Service, useValue: { listarPorProyecto: vi.fn(() => of([])) } },
      { provide: SeoService, useValue: seo }
    ]
  });
  return { proyectos, seo };
}

async function abrir(url: string, datos: Datos = {}) {
  const dobles = montar(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(url, ProyectoDetalleComponent);
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
  const el = harness.routeNativeElement as HTMLElement;
  return {
    ...dobles, harness, instancia, el, router: TestBed.inject(Router),
    menu: () => Array.from(el.querySelectorAll('.menu-seccion')).map(a => a.textContent?.trim()),
    refrescar: async () => { await harness.fixture.whenStable(); harness.detectChanges(); }
  };
}

const ubicacion = {
  proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá', latitud: 5.5, longitud: -73.3,
  googleMapsUrl: 'https://maps.google.com/?q=5.5,-73.3', recorrido360Url: 'https://res.cloudinary.com/x/image/upload/v1/e.jpg'
};
const respaldo = { id: 1, tipo: 'RESPALDO', url: 'https://x.com/r.png', portada: false, publicado: true, activo: true };
const imagen = { id: 2, tipo: 'IMAGEN', url: 'https://x.com/galeria.png', portada: false, publicado: true, activo: true };

describe('ProyectoDetalleComponent', () => {
  beforeEach(() => {
    document.body.classList.remove('con-pantalla-completa');
    localStorage.clear();
  });
  afterEach(() => {
    raiz.requestFullscreen = fullscreenOriginal;
    vi.restoreAllMocks();
  });

  describe('estados de carga', () => {
    it('mientras carga muestra el indicador', async () => {
      const { el, instancia } = await abrir('/proyectos/7/bienvenida', { proyecto: new Subject() });
      expect(instancia.datos.estado()).toBe('cargando');
      expect(el.querySelector('[role="status"]')?.textContent).toContain('Cargando proyecto...');
      expect(el.querySelector('.visor')).toBeNull();
    });

    it('carga el proyecto del id de la URL', async () => {
      const { proyectos, instancia } = await abrir('/proyectos/7/bienvenida');
      expect(proyectos.getProyectoPorId).toHaveBeenCalledWith(7);
      expect(instancia.datos.estado()).toBe('listo');
    });

    it('si el proyecto no existe (404) ofrece volver a todos los proyectos y pide no indexar la página', async () => {
      const { el, seo, instancia } = await abrir('/proyectos/7/bienvenida', { proyecto: throwError(() => new HttpErrorResponse({ status: 404 })) });
      expect(instancia.datos.estado()).toBe('no-encontrado');
      expect(el.querySelector('h2')?.textContent).toBe('Proyecto no encontrado');
      expect(el.querySelector<HTMLAnchorElement>('.btn-estado')?.getAttribute('href')).toBe('/proyectos');
      expect(seo.establecer).toHaveBeenCalledWith({ titulo: 'Proyecto no encontrado', noindex: true });
    });

    it.each(['abc', '0', '-3', '1.5'])('un id inválido (%s) es "no encontrado" sin consultar al servidor', async id => {
      const { proyectos, instancia, el } = await abrir(`/proyectos/${id}/bienvenida`);
      expect(proyectos.getProyectoPorId).not.toHaveBeenCalled();
      expect(instancia.datos.estado()).toBe('no-encontrado');
      expect(el.querySelector('h2')?.textContent).toBe('Proyecto no encontrado');
    });

    it('un error de servidor muestra el aviso y "Reintentar" vuelve a pedir el proyecto', async () => {
      const { el, proyectos, harness, instancia, refrescar } = await abrir('/proyectos/7/bienvenida', { proyecto: throwError(() => new HttpErrorResponse({ status: 500 })) });
      expect(instancia.datos.estado()).toBe('error');
      expect(el.querySelector('h2')?.textContent).toBe('No pudimos cargar el proyecto');

      proyectos.getProyectoPorId.mockReturnValue(of({ id: 7, empresaId: 1, nombre: 'La Hacienda' }) as never);
      el.querySelector<HTMLButtonElement>('button.btn-estado')!.click();
      harness.detectChanges();
      await refrescar();

      expect(proyectos.getProyectoPorId).toHaveBeenCalledTimes(2);
      expect(instancia.datos.estado()).toBe('listo');
      expect(el.querySelector('.visor')).not.toBeNull();
    });
  });

  describe('menú lateral', () => {
    it('muestra la marca, el nombre del proyecto y su lugar', async () => {
      const { el } = await abrir('/proyectos/7/bienvenida', { ubicacion });
      expect(el.querySelector('.sello')?.textContent).toBe('Arquinova');
      expect(el.querySelector('h1')?.textContent).toBe('La Hacienda');
      expect(el.querySelector('.lugar')?.textContent?.trim()).toBe('Tunja, Boyacá');
      expect(el.querySelector<HTMLElement>('.fondo')!.style.backgroundImage).toContain('p.jpg');
    });

    it('sin ubicación ni imagen no muestra el lugar ni el fondo', async () => {
      const { el, instancia } = await abrir('/proyectos/7/bienvenida', { proyecto: of({ id: 7, empresaId: 1, nombre: 'La Hacienda' }) });
      expect(instancia.ubicacionTexto()).toBe('');
      expect(el.querySelector('.lugar')).toBeNull();
      expect(el.querySelector<HTMLElement>('.fondo')!.style.backgroundImage).toBe('');
    });

    it('lista solo las secciones con contenido, con enlaces al proyecto', async () => {
      const { el, menu } = await abrir('/proyectos/7/bienvenida', { ubicacion, multimedia: [respaldo] });
      expect(menu()).toEqual(['Bienvenida', 'Respaldo', 'Ubicación', 'Contacto']);
      expect(Array.from(el.querySelectorAll('.menu-seccion')).map(a => a.getAttribute('href'))).toEqual([
        '/proyectos/7/bienvenida', '/proyectos/7/respaldo', '/proyectos/7/ubicacion', '/proyectos/7/contacto'
      ]);
    });

    it('marca la sección activa y despliega solo sus vistas', async () => {
      const { el } = await abrir('/proyectos/7/ubicacion?vista=google-maps', { ubicacion });
      expect(Array.from(el.querySelectorAll('.menu-grupo.activo .menu-seccion')).map(a => a.textContent?.trim())).toEqual(['Ubicación']);
      const vistas = Array.from(el.querySelectorAll<HTMLAnchorElement>('.menu-vistas a'));
      expect(vistas.map(v => v.textContent?.trim())).toEqual(['Entorno 360', 'Mapa', 'Google Maps']);
      expect(vistas.map(v => v.classList.contains('activa'))).toEqual([false, false, true]);
      expect(vistas[0].getAttribute('href')).toBe('/proyectos/7/ubicacion?vista=entorno-360');
    });

    it('sin vista en la URL marca la primera vista de la sección', async () => {
      const { el, instancia } = await abrir('/proyectos/7/ubicacion', { ubicacion });
      expect(instancia.vistaDe('ubicacion')).toBe('entorno-360');
      expect(el.querySelector('.menu-vistas a.activa')?.textContent?.trim()).toBe('Entorno 360');
    });

    it('una vista que no existe cae a la primera', async () => {
      const { instancia } = await abrir('/proyectos/7/ubicacion?vista=inventada', { ubicacion });
      expect(instancia.vistaDe('ubicacion')).toBe('entorno-360');
    });

    it('Bienvenida sin vista elegida muestra la portada y no marca ninguna vista', async () => {
      const { el, instancia } = await abrir('/proyectos/7/bienvenida', { multimedia: [imagen] });
      expect(el.querySelectorAll('.menu-vistas a').length).toBe(1);
      expect(instancia.vistaDe('bienvenida')).toBeNull();
      expect(el.querySelector('.menu-vistas a.activa')).toBeNull();
    });

    it('vistaDe de una sección que no está activa es null', async () => {
      const { instancia } = await abrir('/proyectos/7/ubicacion', { ubicacion });
      expect(instancia.vistaDe('contacto')).toBeNull();
    });

    it('las secciones sin vistas (Contacto) no despliegan lista', async () => {
      const { el } = await abrir('/proyectos/7/contacto');
      expect(el.querySelector('.menu-vistas')).toBeNull();
    });

    it('tiene el enlace a todos los proyectos y los enlaces legales en otra pestaña', async () => {
      const { el } = await abrir('/proyectos/7/bienvenida');
      expect(el.querySelector('.menu-pie > a')?.getAttribute('href')).toBe('/proyectos');
      const legales = Array.from(el.querySelectorAll<HTMLAnchorElement>('.enlaces-legales a'));
      expect(legales.map(a => a.getAttribute('href'))).toEqual(['/legal/politica-datos', '/legal/terminos', '/legal/cookies']);
      expect(legales.every(a => a.target === '_blank')).toBe(true);
    });
  });

  describe('barra superior', () => {
    it('muestra "Sección › Vista"', async () => {
      const { el, instancia } = await abrir('/proyectos/7/ubicacion?vista=google-maps', { ubicacion });
      expect(instancia.seccionTitulo()).toBe('Ubicación');
      expect(instancia.vistaTitulo()).toBe('Google Maps');
      expect(el.querySelector('.barra strong')?.textContent).toBe('Ubicación');
      expect(el.querySelector('.barra .sep')?.textContent).toBe('›');
    });

    it('sin vistas muestra solo la sección', async () => {
      const { el } = await abrir('/proyectos/7/contacto');
      expect(el.querySelector('.barra strong')?.textContent).toBe('Contacto');
      expect(el.querySelector('.barra .sep')).toBeNull();
    });

    it('en una sección que no existe en el menú queda vacía', async () => {
      const { instancia } = await abrir('/proyectos/7/inventada');
      expect(instancia.seccionTitulo()).toBe('');
      expect(instancia.vistaTitulo()).toBe('');
    });

    it('renderiza la sección hija en la página', async () => {
      const { el } = await abrir('/proyectos/7/contacto');
      expect(el.querySelector('.pagina .hija')).not.toBeNull();
    });

    it('se actualiza al navegar a otra sección', async () => {
      const { harness, instancia } = await abrir('/proyectos/7/contacto');
      await harness.navigateByUrl('/proyectos/7/bienvenida');
      harness.detectChanges();
      expect(instancia.seccionActiva()).toBe('bienvenida');
      expect(instancia.seccionTitulo()).toBe('Bienvenida');
    });
  });

  describe('modos inmersivos', () => {
    it('la portada de Bienvenida es inmersiva', async () => {
      const { el, instancia } = await abrir('/proyectos/7/bienvenida');
      expect(instancia.inmersivo()).toBe(true);
      expect(el.querySelector('.visor')?.classList.contains('inmersivo')).toBe(true);
    });

    it('Beneficios con lámina es inmersiva', async () => {
      const lamina = { id: 5, tipo: 'BENEFICIOS', url: 'https://x.com/b.png', portada: false, publicado: true, activo: true };
      const { instancia } = await abrir('/proyectos/7/bienvenida?vista=beneficios', { multimedia: [lamina] });
      expect(instancia.vistaDe('bienvenida')).toBe('beneficios');
      expect(instancia.inmersivo()).toBe(true);
    });

    it('con la vista Beneficios activa por texto institucional (sin lámina) el panel es normal', async () => {
      montar();
      (TestBed.inject(ContenidoService) as unknown as { obtenerPublicadosPorEmpresa: ReturnType<typeof vi.fn> })
        .obtenerPublicadosPorEmpresa.mockReturnValue(of([{ id: 1, empresaId: 1, seccion: 'BENEFICIOS', titulo: 'T', contenido: 'C', publicado: true }]));
      const harness = await RouterTestingHarness.create();
      const instancia = await harness.navigateByUrl('/proyectos/7/bienvenida?vista=beneficios', ProyectoDetalleComponent);
      harness.detectChanges();
      expect(instancia.vistaDe('bienvenida')).toBe('beneficios');
      expect(instancia.inmersivo()).toBe(false);
      expect((harness.routeNativeElement as HTMLElement).querySelector('.visor')?.classList.contains('inmersivo')).toBe(false);
    });

    it('Respaldo siempre es inmersiva', async () => {
      const { instancia } = await abrir('/proyectos/7/respaldo', { multimedia: [respaldo] });
      expect(instancia.inmersivo()).toBe(true);
    });

    it('una vista de Ubicación que el servicio considera inmersiva la hace inmersiva', async () => {
      const { instancia, el } = await abrir('/proyectos/7/ubicacion?vista=google-maps', { ubicacion });
      expect(instancia.inmersivo()).toBe(true);
      expect(el.querySelector('.visor')?.classList.contains('inmersivo')).toBe(true);
    });

    it('Contacto y las secciones normales no son inmersivas', async () => {
      const { instancia, el } = await abrir('/proyectos/7/contacto');
      expect(instancia.inmersivo()).toBe(false);
      expect(el.querySelector('.visor')?.classList.contains('inmersivo')).toBe(false);
    });
  });

  describe('menú plegable y móvil', () => {
    it('el botón pliega y vuelve a mostrar el menú, con su etiqueta y flecha', async () => {
      const { el, harness, instancia } = await abrir('/proyectos/7/bienvenida');
      const boton = () => el.querySelector<HTMLButtonElement>('.btn-colapsar')!;
      expect(boton().getAttribute('aria-label')).toBe('Ocultar menú');
      expect(boton().textContent?.trim()).toBe('‹');

      boton().click();
      harness.detectChanges();
      expect(instancia.menuColapsado()).toBe(true);
      expect(el.querySelector('.visor')?.classList.contains('colapsado')).toBe(true);
      expect(boton().getAttribute('aria-label')).toBe('Mostrar menú');
      expect(boton().textContent?.trim()).toBe('›');

      boton().click();
      harness.detectChanges();
      expect(el.querySelector('.visor')?.classList.contains('colapsado')).toBe(false);
    });

    it('el botón móvil abre el cajón y el velo, la sección o una vista lo cierran', async () => {
      const { el, harness, instancia } = await abrir('/proyectos/7/ubicacion?vista=google-maps', { ubicacion });
      const abierto = () => el.querySelector('.visor')!.classList.contains('movil-abierto');
      const abrirCajon = () => { el.querySelector<HTMLButtonElement>('.btn-menu-movil')!.click(); harness.detectChanges(); };
      expect(el.querySelector('.btn-menu-movil')?.getAttribute('aria-label')).toBe('Abrir menú');

      abrirCajon();
      expect(abierto()).toBe(true);
      el.querySelector<HTMLElement>('.velo')!.click();
      harness.detectChanges();
      expect(abierto()).toBe(false);

      abrirCajon();
      el.querySelector<HTMLAnchorElement>('.menu-vistas a')!.click();
      harness.detectChanges();
      expect(abierto()).toBe(false);

      await harness.fixture.whenStable();
      harness.detectChanges();
      abrirCajon();
      el.querySelector<HTMLAnchorElement>('.menu-seccion')!.click();
      harness.detectChanges();
      expect(abierto()).toBe(false);
      expect(instancia.menuMovilAbierto()).toBe(false);
    });
  });

  describe('SEO', () => {
    const ultimo = (seo: { establecer: ReturnType<typeof vi.fn> }) => seo.establecer.mock.calls.at(-1)![0] as Record<string, unknown> & { jsonLd: Record<string, unknown> };

    it('describe el proyecto y su sección activa con datos estructurados de lugar', async () => {
      const { seo } = await abrir('/proyectos/7/ubicacion', { ubicacion });
      expect(ultimo(seo)).toMatchObject({
        titulo: 'Ubicación · La Hacienda en Tunja, Boyacá',
        descripcion: 'Un proyecto campestre',
        imagen: 'https://x.com/p.jpg',
        ruta: '/proyectos/7/ubicacion'
      });
      expect(ultimo(seo).jsonLd).toEqual({
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: 'La Hacienda',
        description: 'Un proyecto campestre',
        image: 'https://x.com/p.jpg',
        address: { '@type': 'PostalAddress', addressLocality: 'Tunja', addressRegion: 'Boyacá', addressCountry: 'CO' },
        geo: { '@type': 'GeoCoordinates', latitude: 5.5, longitude: -73.3 }
      });
    });

    it('en Bienvenida el título no lleva prefijo de sección', async () => {
      const { seo } = await abrir('/proyectos/7/bienvenida', { ubicacion });
      expect(ultimo(seo)['titulo']).toBe('La Hacienda en Tunja, Boyacá');
    });

    it('sin sección en la URL usa la ruta de Bienvenida', async () => {
      const { seo } = await abrir('/proyectos/7', { ubicacion });
      expect(ultimo(seo)['ruta']).toBe('/proyectos/7/bienvenida');
      expect(ultimo(seo)['titulo']).toBe('La Hacienda en Tunja, Boyacá');
    });

    it('sin descripción propia usa el texto por defecto con el lugar', async () => {
      const { seo } = await abrir('/proyectos/7/bienvenida', { ubicacion, proyecto: of({ id: 7, empresaId: 1, nombre: 'La Hacienda', imagenUrl: 'https://x.com/p.jpg' }) });
      expect(ultimo(seo)['descripcion']).toBe('La Hacienda en Tunja, Boyacá: proyecto de Grupo Arquinova.');
    });

    it('sin ubicación no hay lugar, dirección ni coordenadas', async () => {
      const { seo } = await abrir('/proyectos/7/bienvenida', { proyecto: of({ id: 7, empresaId: 1, nombre: 'La Hacienda' }) });
      expect(ultimo(seo)['titulo']).toBe('La Hacienda');
      expect(ultimo(seo)['descripcion']).toBe('La Hacienda: proyecto de Grupo Arquinova.');
      expect(ultimo(seo).jsonLd['address']).toBeUndefined();
      expect(ultimo(seo).jsonLd['geo']).toBeUndefined();
    });

    it('sin imagen del proyecto usa la primera imagen de su multimedia', async () => {
      const { seo } = await abrir('/proyectos/7/bienvenida', { proyecto: of({ id: 7, empresaId: 1, nombre: 'La Hacienda' }), multimedia: [imagen] });
      expect(ultimo(seo)['imagen']).toBe('https://x.com/galeria.png');
    });

    it('sin ninguna imagen manda null', async () => {
      const { seo } = await abrir('/proyectos/7/bienvenida', { proyecto: of({ id: 7, empresaId: 1, nombre: 'La Hacienda' }) });
      expect(ultimo(seo)['imagen']).toBeNull();
      expect(ultimo(seo).jsonLd['image']).toBeUndefined();
    });

    it('una ubicación sin ciudad no manda dirección y sin coordenadas no manda geo', async () => {
      const { seo } = await abrir('/proyectos/7/bienvenida', { ubicacion: { proyectoId: 7, ciudad: '', departamento: 'Boyacá' } });
      expect(ultimo(seo).jsonLd['address']).toBeUndefined();
      expect(ultimo(seo)['titulo']).toBe('La Hacienda en Boyacá');
    });

    it('al navegar a otra sección se actualiza el título', async () => {
      const { seo, harness } = await abrir('/proyectos/7/bienvenida', { ubicacion });
      await harness.navigateByUrl('/proyectos/7/contacto');
      harness.detectChanges();
      await vi.waitFor(() => expect(ultimo(seo)['titulo']).toBe('Contacto · La Hacienda en Tunja, Boyacá'), { timeout: 5000 });
    });

    it('al cambiar de idioma los títulos y textos se rehacen en inglés', async () => {
      const { seo, harness, menu } = await abrir('/proyectos/7/ubicacion', { ubicacion });
      const idioma = TestBed.inject(IdiomaService);
      idioma.cambiar('en', false);
      await vi.waitFor(() => expect(idioma.idioma()).toBe('en'), { timeout: 5000 });
      harness.detectChanges();

      expect(menu()).toEqual(['Welcome', 'Location', 'Contact']);
      expect(ultimo(seo)['titulo']).toBe('Location · La Hacienda in Tunja, Boyacá');
    });
  });

  describe('selector de idioma y pantalla completa', () => {
    it('al cambiar el idioma todo el micrositio (menú y barra) pasa a ese idioma', async () => {
      const { el, harness, menu } = await abrir('/proyectos/7/contacto');
      expect(menu()).toEqual(['Bienvenida', 'Contacto']);

      // El selector de idioma del menú llama a este mismo método (su propia prueba cubre los botones)
      expect(el.querySelector('app-selector-idioma')).not.toBeNull();
      const idioma = TestBed.inject(IdiomaService);
      idioma.cambiar('en', false);
      await vi.waitFor(() => expect(idioma.idioma()).toBe('en'), { timeout: 5000 });
      harness.detectChanges();

      expect(menu()).toEqual(['Welcome', 'Contact']);
      expect(el.querySelector('.barra strong')?.textContent).toBe('Contact');
    });

    it('el botón de pantalla completa pide pantalla completa de la página', async () => {
      const pedir = vi.fn().mockResolvedValue(undefined);
      raiz.requestFullscreen = pedir;
      const { el, harness } = await abrir('/proyectos/7/bienvenida');
      await harness.fixture.whenStable();
      harness.detectChanges();

      const boton = el.querySelector<HTMLButtonElement>('app-boton-pantalla-completa button');
      expect(boton).not.toBeNull();
      boton!.click();
      expect(pedir).toHaveBeenCalled();
    });

    it('si el navegador no permite pantalla completa no muestra el botón', async () => {
      raiz.requestFullscreen = undefined;
      const { el, harness } = await abrir('/proyectos/7/bienvenida');
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(el.querySelector('app-boton-pantalla-completa button')).toBeNull();
    });
  });
});
