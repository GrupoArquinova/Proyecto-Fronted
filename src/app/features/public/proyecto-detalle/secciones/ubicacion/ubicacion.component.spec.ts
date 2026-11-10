import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { Ubicacion } from '../../../../../core/models/ubicacion.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { Visor360Component } from '../visor-360/visor-360.component';
import { PlanoPuntosComponent } from '../plano-puntos/plano-puntos.component';
import { UbicacionComponent } from './ubicacion.component';

// El visor real necesita WebGL: aquí se cambia por uno que no hace nada
vi.mock('@photo-sphere-viewer/core', () => ({
  Viewer: class {
    destroy() { /* sin efecto */ }
    animate() { return null; }
    addEventListener() { /* sin efecto */ }
    getPlugin() { return { setMarkers() { /* sin efecto */ }, addEventListener() { /* sin efecto */ } }; }
  }
}));
vi.mock('@photo-sphere-viewer/markers-plugin', () => ({ MarkersPlugin: class {} }));

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const IMG = 'https://res.cloudinary.com/x/image/upload/v1/pano.jpg';
const VIDEO = 'https://res.cloudinary.com/x/video/upload/v1/clip.mp4';
const TOUR = 'https://youtu.be/abc123';

const punto = (id: number, extra: Partial<Punto360> = {}): Punto360 =>
  ({ id, proyectoId: 7, escena: 'ENTORNO', etiqueta: `P${id}`, ...extra });

const detalle = (u: Partial<Ubicacion> | null, extra: Partial<ProyectoDetalle> = {}): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: u ? { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá', ...u } : null,
  zonasComunes: [], casasModelo: [], lotes: [], multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: [],
  ...extra
});

async function abrir(datos: ProyectoDetalle | null, consulta = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'proyectos/:id/ubicacion', component: UbicacionComponent },
        { path: 'proyectos/:id/bienvenida', component: Vacio }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService,
      { provide: MultimediaService, useValue: { listarPublicadosPorEntidad: vi.fn(() => of([])) } }
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/ubicacion${consulta}`, UbicacionComponent);
  harness.detectChanges();
  return { harness, instancia, router: TestBed.inject(Router), el: harness.routeNativeElement as HTMLElement };
}

describe('UbicacionComponent', () => {
  describe('entorno 360°', () => {
    it('con imagen usa el visor 360 a pantalla completa con solo los lugares cercanos del entorno', async () => {
      const lugar = punto(1);
      const lote = punto(2, { loteId: 5 });
      const aerea = punto(3, { escena: 'AEREA' });
      const { harness, el, instancia } = await abrir(detalle({ recorrido360Url: IMG }, { puntos: [lugar, lote, aerea] }), '?vista=entorno-360');
      const visor = harness.routeDebugElement!.query(By.directive(Visor360Component));
      expect(instancia.inmersiva()).toBe(true);
      expect(instancia.tipoEntorno()).toBe('imagen');
      expect(visor.componentInstance.url()).toBe(IMG);
      expect(visor.componentInstance.completo()).toBe(true);
      expect(visor.componentInstance.puntos()).toEqual([lugar]);
      expect(el.querySelector('.visor-360')?.getAttribute('aria-label')).toBe('Recorrido 360: entorno del proyecto');
    });

    it('con video o tour incrustado lo muestra en el lienzo a pantalla completa', async () => {
      const { el, instancia } = await abrir(detalle({ recorrido360Url: TOUR }), '?vista=entorno-360');
      expect(instancia.tipoEntorno()).toBe('incrustado');
      expect(el.querySelector('.lienzo app-medio iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123');
      expect(el.querySelector('app-visor-360')).toBeNull();
    });

    it('con un enlace no incrustable queda la página normal con título y botón externo', async () => {
      const { el, instancia } = await abrir(detalle({ recorrido360Url: 'https://ejemplo.com/tour' }), '?vista=entorno-360');
      expect(instancia.inmersiva()).toBe(false);
      expect(el.querySelector('h2')?.textContent).toBe('Entorno 360°');
      expect(el.querySelector('app-medio a.enlace')?.getAttribute('href')).toBe('https://ejemplo.com/tour');
    });

    it('al pulsar un botón del visor abre la tarjeta de un lote o etapa, y la X la cierra', async () => {
      const lote = punto(2, { loteId: 5, etiqueta: 'Lote 5' });
      const { harness, el, instancia } = await abrir(detalle({ recorrido360Url: IMG }), '?vista=entorno-360');
      harness.routeDebugElement!.query(By.directive(Visor360Component)).componentInstance.puntoElegido.emit(lote);
      harness.detectChanges();

      expect(instancia.tarjeta()).toEqual(lote);
      expect(el.querySelector('app-tarjeta-punto h3')?.textContent).toBe('Lote 5');

      el.querySelector<HTMLButtonElement>('app-tarjeta-punto .cerrar')!.click();
      harness.detectChanges();
      expect(el.querySelector('app-tarjeta-punto')).toBeNull();
    });

    it('un lugar cercano es solo un rótulo: no abre tarjeta', async () => {
      const { instancia } = await abrir(detalle({ recorrido360Url: IMG }), '?vista=entorno-360');
      instancia.abrirPunto(punto(1));
      expect(instancia.tarjeta()).toBeNull();
    });

    it('al cambiar de vista se cierra la tarjeta abierta', async () => {
      const { harness, instancia } = await abrir(detalle({ recorrido360Url: IMG, vistaAereaUrl: IMG }), '?vista=entorno-360');
      instancia.abrirPunto(punto(2, { loteId: 5 }));
      expect(instancia.tarjeta()).not.toBeNull();

      await harness.navigateByUrl('/proyectos/7/ubicacion?vista=vista-aerea', UbicacionComponent);
      harness.detectChanges();
      expect(instancia.tarjeta()).toBeNull();
    });
  });

  describe('vista aérea', () => {
    it('con imagen usa el visor 360 con solo los botones que apuntan a algo', async () => {
      const lote = punto(2, { escena: 'AEREA', loteId: 5 });
      const lugar = punto(3, { escena: 'AEREA' });
      const { harness, instancia } = await abrir(detalle({ vistaAereaUrl: IMG }, { puntos: [lote, lugar, punto(4)] }), '?vista=vista-aerea');
      const visor = harness.routeDebugElement!.query(By.directive(Visor360Component));
      expect(instancia.tipoAerea()).toBe('imagen');
      expect(visor.componentInstance.url()).toBe(IMG);
      expect(visor.componentInstance.puntos()).toEqual([lote]);
    });

    it('con video lo reproduce en el lienzo', async () => {
      const { el } = await abrir(detalle({ vistaAereaUrl: VIDEO }), '?vista=vista-aerea');
      expect(el.querySelector('.lienzo app-medio video')?.getAttribute('src')).toBe(VIDEO);
    });

    it('con un enlace no incrustable es página normal', async () => {
      const { el } = await abrir(detalle({ vistaAereaUrl: 'https://ejemplo.com/aerea' }), '?vista=vista-aerea');
      expect(el.querySelector('h2')?.textContent).toBe('Vista aérea');
      expect(el.querySelector('app-medio a.enlace')).not.toBeNull();
    });
  });

  describe('urbanismo', () => {
    it('con imagen usa el plano con botones por porcentaje y abre la tarjeta de la etapa elegida', async () => {
      const etapa = punto(1, { escena: 'URBANISMO', etapaId: 3, etiqueta: 'Etapa 3', posX: 20, posY: 30 });
      const { harness, el, instancia } = await abrir(detalle({ urbanismoUrl: IMG }, { puntos: [etapa, punto(2)] }), '?vista=urbanismo');
      const plano = harness.routeDebugElement!.query(By.directive(PlanoPuntosComponent)).componentInstance as PlanoPuntosComponent;
      expect(plano.completo()).toBe(true);
      expect(plano.puntos()).toEqual([etapa]);

      el.querySelector<HTMLButtonElement>('app-plano-puntos .pin')!.click();
      harness.detectChanges();
      expect(instancia.tarjeta()?.etapaId).toBe(3);
      expect(el.querySelector('app-tarjeta-punto .tipo')?.textContent).toBe('Etapa');
    });

    it('si el plano no es imagen queda como página normal con su enlace', async () => {
      const { el, instancia } = await abrir(detalle({ urbanismoUrl: 'https://ejemplo.com/plano.pdf' }), '?vista=urbanismo');
      expect(instancia.inmersiva()).toBe(false);
      expect(el.querySelector('h2')?.textContent).toBe('Urbanismo');
      expect(el.querySelector('app-medio a.enlace')?.getAttribute('href')).toBe('https://ejemplo.com/plano.pdf');
    });
  });

  describe('mapas', () => {
    it('con imágenes de mapa las muestra en un carrusel a pantalla completa', async () => {
      const { el, instancia } = await abrir(detalle({ proyectoNombre: 'Mi Proyecto' }, {
        multimedia: [{ id: 1, tipo: 'MAPA', url: 'https://x.com/mapa.png', portada: false, publicado: true, activo: true } as never]
      }), '?vista=mapa');
      expect(instancia.inmersiva()).toBe(true);
      expect(instancia.mapas().length).toBe(1);
      expect(el.querySelector('app-carrusel-laminas img')?.getAttribute('src')).toBe('https://x.com/mapa.png');
      expect(el.querySelector('app-carrusel-laminas img')?.getAttribute('alt')).toBe('Mapa de ubicación de Mi Proyecto');
    });

    it('sin nombre de proyecto en la ubicación el texto alternativo usa "el proyecto"', async () => {
      const { el } = await abrir(detalle({}, {
        multimedia: [{ id: 1, tipo: 'MAPA', url: 'https://x.com/mapa.png', portada: false, publicado: true, activo: true } as never]
      }), '?vista=mapa');
      expect(el.querySelector('app-carrusel-laminas img')?.getAttribute('alt')).toBe('Mapa de ubicación de el proyecto');
    });

    it('sin imágenes pero con coordenadas muestra el mapa interactivo de OpenStreetMap', async () => {
      const { el, instancia } = await abrir(detalle({ latitud: 4.5, longitud: -75.6 }), '?vista=mapa');
      expect(instancia.inmersiva()).toBe(false);
      expect(el.querySelector('h2')?.textContent).toBe('Mapa');
      expect(el.querySelector('iframe')?.getAttribute('src')).toContain('https://www.openstreetmap.org/export/embed.html?bbox=');
      expect(el.querySelector('iframe')?.getAttribute('src')).toContain('marker=4.5,-75.6');
      expect(el.querySelector('iframe')?.title).toBe('Mapa de ubicación del proyecto');
      expect(el.querySelector('iframe')?.getAttribute('sandbox')).toContain('allow-scripts');
      expect(el.querySelector('iframe')?.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    });

    it('sin latitud o longitud no hay mapa interactivo', async () => {
      const { instancia } = await abrir(detalle({ latitud: 4.5 }));
      expect(instancia.mapaUrl()).toBeNull();
    });

    it('Google Maps con coordenadas se incrusta a pantalla completa con el nombre del proyecto', async () => {
      const { el, instancia } = await abrir(detalle({ googleMapsUrl: 'https://maps.google.com/?q=4.5,-75.6', proyectoNombre: 'La Hacienda' }), '?vista=google-maps');
      expect(instancia.inmersiva()).toBe(true);
      expect(instancia.googleMaps()).not.toBeNull();
      expect(el.querySelector('.lienzo iframe')?.getAttribute('src')).toContain('https://www.google.com/maps?q=4.500000,-75.600000');
      expect(el.querySelector('.lienzo iframe')?.getAttribute('title')).toBe('Mapa de Google de La Hacienda');
      expect(el.querySelector('.lienzo iframe')?.getAttribute('sandbox')).toContain('allow-same-origin');
    });

    it('Google Maps con un enlace corto sin coordenadas queda como botón externo', async () => {
      const { el, instancia } = await abrir(detalle({ googleMapsUrl: 'https://maps.app.goo.gl/abc' }), '?vista=google-maps');
      expect(instancia.googleMaps()).toBeNull();
      expect(instancia.inmersiva()).toBe(false);
      expect(el.querySelector('h2')?.textContent).toBe('Google Maps');
      expect(el.querySelector('app-medio a.enlace')?.getAttribute('href')).toBe('https://maps.app.goo.gl/abc');
    });

    it('Google Maps sin nombre en la ubicación usa "el proyecto" en el título del mapa', async () => {
      const { el } = await abrir(detalle({ googleMapsUrl: 'https://maps.google.com/?q=4.5,-75.6' }), '?vista=google-maps');
      expect(el.querySelector('.lienzo iframe')?.getAttribute('title')).toBe('Mapa de Google de el proyecto');
    });
  });

  describe('vista por defecto y datos', () => {
    it('muestra la dirección completa y las referencias de cómo llegar', async () => {
      const { el } = await abrir(detalle({ direccion: 'Km 3 vía Armenia', referencias: 'Después del peaje' }), '');
      expect(el.querySelector('h2')?.textContent).toBe('Ubicación');
      const parrafos = Array.from(el.querySelectorAll('.datos p')).map(p => p.textContent?.replace(/\s+/g, ' ').trim());
      expect(parrafos).toEqual(['Dirección: Km 3 vía Armenia, Tunja, Boyacá', 'Cómo llegar: Después del peaje']);
    });

    it('sin referencias solo muestra la dirección', async () => {
      const { el } = await abrir(detalle({}));
      expect(el.querySelectorAll('.datos p').length).toBe(1);
    });

    it('sin lugar ni referencias no muestra el bloque de datos', async () => {
      const { el, instancia } = await abrir(detalle({ ciudad: '', departamento: '' }));
      expect(instancia.lugar()).toBe('');
      expect(el.querySelector('.datos')).toBeNull();
    });

    it('las vistas de contenido normal también muestran los datos debajo', async () => {
      const { el } = await abrir(detalle({ recorrido360Url: 'https://ejemplo.com/tour', referencias: 'Frente al río' }), '?vista=entorno-360');
      expect(el.querySelector('.datos')?.textContent).toContain('Frente al río');
    });
  });

  it('sin ubicación cargada la sección no existe y vuelve a Bienvenida', async () => {
    const { router, instancia } = await abrir(detalle(null));
    expect(instancia.ubicacion()).toBeNull();
    expect(instancia.lugar()).toBe('');
    await vi.waitFor(() => expect(router.url).toBe('/proyectos/7/bienvenida'), { timeout: 5000 });
  });

  it('sin detalle no pinta nada', async () => {
    const { el } = await abrir(null);
    expect(el.querySelector('section')).toBeNull();
  });
});
