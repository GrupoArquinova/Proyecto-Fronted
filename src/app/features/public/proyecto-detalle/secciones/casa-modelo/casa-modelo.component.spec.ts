import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { IdiomaService } from '../../../../../core/services/idioma.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { CasaModelo } from '../../../../../core/models/casa-modelo.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { CasaModeloPublicoComponent } from './casa-modelo.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const casa = (id: number, nombre: string, extra: Partial<CasaModelo> = {}): CasaModelo =>
  ({ id, proyectoId: 7, nombre, publicado: true, activo: true, ...extra });

const mm = (casaModeloId: number, tipo: 'IMAGEN' | 'PLANO', id: number, extra: object = {}) =>
  ({ id, casaModeloId, tipo, url: `https://x.com/${tipo.toLowerCase()}${id}.png`, portada: false, publicado: true, activo: true, ...extra }) as never;

const detalle = (casas: CasaModelo[], multimediaCasas: unknown[] = []): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: null,
  zonasComunes: [], casasModelo: casas, lotes: [], multimedia: [], multimediaCasas: multimediaCasas as never, multimediaZonas: [], contenido: [], puntos: []
});

async function abrir(datos: ProyectoDetalle | null, consulta = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'proyectos/:id/casa-modelo', component: CasaModeloPublicoComponent },
        { path: 'proyectos/:id/bienvenida', component: Vacio }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/casa-modelo${consulta}`, CasaModeloPublicoComponent);
  harness.detectChanges();
  return { harness, instancia, router: TestBed.inject(Router), el: harness.routeNativeElement as HTMLElement };
}

describe('CasaModeloPublicoComponent', () => {
  describe('ficha de la tipología', () => {
    it('muestra nombre, datos con singular/plural y descripción', async () => {
      const { el } = await abrir(detalle([casa(8, 'Villa Samán', { areaConstruidaM2: 293, numeroHabitaciones: 3, numeroBanos: 1, descripcion: 'Dos plantas' })], [mm(8, 'IMAGEN', 1)]));
      expect(el.querySelector('h2')?.textContent).toBe('Villa Samán');
      expect(Array.from(el.querySelectorAll('.datos li')).map(li => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['293 m² construidos', '3 habitaciones', '1 baño']);
      expect(el.querySelector('.descripcion')?.textContent).toBe('Dos plantas');
    });

    it('con una habitación y varios baños usa singular y plural respectivamente', async () => {
      const { el } = await abrir(detalle([casa(8, 'V', { numeroHabitaciones: 1, numeroBanos: 4 })], [mm(8, 'IMAGEN', 1)]));
      expect(Array.from(el.querySelectorAll('.datos li')).map(li => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['1 habitación', '4 baños']);
    });

    it('sin datos numéricos ni descripción no pinta la lista ni el párrafo', async () => {
      const { el } = await abrir(detalle([casa(8, 'V')], [mm(8, 'IMAGEN', 1)]));
      expect(el.querySelector('.datos')).toBeNull();
      expect(el.querySelector('.descripcion')).toBeNull();
    });

    it('con una sola tipología no muestra el selector', async () => {
      const { el } = await abrir(detalle([casa(8, 'V')], [mm(8, 'IMAGEN', 1)]));
      expect(el.querySelector('.selector')).toBeNull();
    });
  });

  describe('selector de tipologías', () => {
    const casas = () => [casa(8, 'Samán'), casa(9, 'Guayacán')];
    const archivos = () => [mm(8, 'IMAGEN', 1, { titulo: 'render_saman' }), mm(9, 'IMAGEN', 2, { titulo: 'render_guayacan' })];

    it('con varias muestra un botón por tipología y la primera activa', async () => {
      const { el } = await abrir(detalle(casas(), archivos()));
      const botones = Array.from(el.querySelectorAll<HTMLButtonElement>('.selector button'));
      expect(botones.map(b => b.textContent?.trim())).toEqual(['Samán', 'Guayacán']);
      expect(botones[0].classList.contains('activo')).toBe(true);
      expect(el.querySelector('h2')?.textContent).toBe('Samán');
    });

    it('elegir otra cambia el título, las imágenes y la consulta de WhatsApp', async () => {
      const { el, harness, instancia } = await abrir(detalle(casas(), archivos()));
      el.querySelectorAll<HTMLButtonElement>('.selector button')[1].click();
      harness.detectChanges();

      expect(instancia.seleccionada()).toBe(1);
      expect(el.querySelector('h2')?.textContent).toBe('Guayacán');
      expect(el.querySelector('app-carrusel-laminas img')?.getAttribute('alt')).toBe('render_guayacan');
      expect(el.querySelector<HTMLAnchorElement>('.consultar-whatsapp')?.href).toContain(encodeURIComponent('tipología Guayacán'));
      expect(el.querySelector('.consultar:not(.consultar-whatsapp)')?.getAttribute('href')).toContain('casa=9');
    });
  });

  describe('vistas', () => {
    it('imágenes: carrusel con las imágenes de esa tipología en orden', async () => {
      const { el } = await abrir(detalle([casa(8, 'V')], [
        mm(8, 'IMAGEN', 2, { orden: 2 }), mm(8, 'IMAGEN', 1, { orden: 1 }), mm(9, 'IMAGEN', 3), mm(8, 'PLANO', 4)
      ]), '?vista=imagenes');
      expect(el.querySelector('.visor app-carrusel-laminas')).not.toBeNull();
      expect(el.querySelector('app-carrusel-laminas img')?.getAttribute('src')).toBe('https://x.com/imagen1.png');
      expect(el.querySelector('.visor app-carrusel-laminas section')?.getAttribute('aria-label')).toBe('Imágenes de V');
    });

    it('planos: imágenes en carrusel y documentos como enlaces', async () => {
      const { el } = await abrir(detalle([casa(8, 'V')], [
        mm(8, 'PLANO', 1, { titulo: 'Planta 1' }),
        mm(8, 'PLANO', 2, { url: 'https://x.com/plano.pdf', titulo: 'Memoria' }),
        mm(8, 'PLANO', 3, { url: 'https://x.com/otro.dwg' })
      ]), '?vista=planos');
      expect(el.querySelector('.visor app-carrusel-laminas img')?.getAttribute('src')).toBe('https://x.com/plano1.png');
      const docs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.documentos a'));
      expect(docs.map(d => d.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Memoria (abrir)', 'Plano (abrir)']);
      expect(docs[0].getAttribute('href')).toBe('https://x.com/plano.pdf');
    });

    it('planos: incluye el plano antiguo de la tipología (imagen) antes de los subidos', async () => {
      const { el, instancia } = await abrir(detalle([casa(8, 'V', { planoUrl: 'https://x.com/viejo.png' })], [mm(8, 'PLANO', 1)]), '?vista=planos');
      expect(instancia.planosImagen().map(l => l.url)).toEqual(['https://x.com/viejo.png', 'https://x.com/plano1.png']);
      expect(instancia.planosImagen()[0].titulo).toBe('Plano');
      expect(el.querySelector('.documentos')).toBeNull();
    });

    it('planos: un plano antiguo que no es imagen sale como documento', async () => {
      const { el, instancia } = await abrir(detalle([casa(8, 'V', { planoUrl: 'https://x.com/viejo.pdf' })], [mm(8, 'IMAGEN', 1)]), '?vista=planos');
      expect(instancia.planosDocumento()).toEqual([{ url: 'https://x.com/viejo.pdf', titulo: 'Plano' }]);
      expect(el.querySelector('.documentos a')?.getAttribute('href')).toBe('https://x.com/viejo.pdf');
    });

    it('tour virtual: incrusta el tour de la tipología', async () => {
      const { el } = await abrir(detalle([casa(8, 'V', { tourVirtualUrl: 'https://my.matterport.com/show/?m=abc' })]), '?vista=tour-virtual');
      expect(el.querySelector('app-medio iframe')?.getAttribute('title')).toBe('el tour virtual');
    });

    it('tour virtual: un enlace no incrustable queda como botón externo', async () => {
      const { el } = await abrir(detalle([casa(8, 'V', { tourVirtualUrl: 'https://ejemplo.com/tour' })]), '?vista=tour-virtual');
      expect(el.querySelector('app-medio a.enlace')?.getAttribute('href')).toBe('https://ejemplo.com/tour');
    });

    it('sin archivos de la vista no pinta carrusel ni documentos', async () => {
      const { el } = await abrir(detalle([casa(8, 'V', { tourVirtualUrl: 'https://ejemplo.com/tour' })]), '?vista=imagenes');
      // "imagenes" no existe en el menú (no hay imágenes), así que cae a la vista de tour
      expect(el.querySelector('.visor')).toBeNull();
    });
  });

  describe('contacto', () => {
    it('el botón "Solicitar información" lleva al contacto del proyecto con la casa en el query param', async () => {
      const { el } = await abrir(detalle([casa(8, 'Samán')], [mm(8, 'IMAGEN', 1)]));
      const enlace = el.querySelector<HTMLAnchorElement>('.consultar:not(.consultar-whatsapp)')!;
      expect(enlace.textContent?.trim()).toBe('Solicitar información');
      expect(enlace.getAttribute('href')).toBe('/proyectos/7/contacto?casa=8');
    });

    it('el botón de WhatsApp trae el mensaje con la ficha de la tipología y el nombre del proyecto', async () => {
      const { el, instancia } = await abrir(detalle([casa(8, 'Samán', { areaConstruidaM2: 293, numeroHabitaciones: 3, numeroBanos: 4 })], [mm(8, 'IMAGEN', 1)]));
      const enlace = el.querySelector<HTMLAnchorElement>('.consultar-whatsapp')!;
      expect(enlace.getAttribute('href')).toBe(instancia.whatsappUrl());
      expect(instancia.whatsappUrl()).toBe(
        'https://wa.me/573168653715?text=' + encodeURIComponent('Hola, estoy interesado en la tipología Samán de La Hacienda (293 m², 3 habitaciones, 4 baños). ¿Me pueden dar más información sobre esta villa?')
      );
      expect(enlace.getAttribute('target')).toBe('_blank');
      expect(enlace.textContent?.replace(/\s+/g, ' ').trim()).toBe('Consultar por Samán');
    });

    it('en inglés el mensaje de WhatsApp sale en inglés', async () => {
      const { instancia, harness } = await abrir(detalle([casa(8, 'Samán', { numeroHabitaciones: 1 })], [mm(8, 'IMAGEN', 1)]));
      const idioma = TestBed.inject(IdiomaService);
      idioma.cambiar('en', false);
      await vi.waitFor(() => expect(idioma.idioma()).toBe('en'), { timeout: 5000 });
      harness.detectChanges();
      expect(decodeURIComponent(instancia.whatsappUrl())).toContain('Hello, I am interested in the Samán house type at La Hacienda (1 bedroom)');
    });
  });

  it('sin tipologías vuelve a Bienvenida y no consulta WhatsApp', async () => {
    const { router, instancia, el } = await abrir(detalle([]));
    expect(instancia.whatsappUrl()).toBe('');
    expect(el.querySelector('section')).toBeNull();
    await vi.waitFor(() => expect(router.url).toBe('/proyectos/7/bienvenida'), { timeout: 5000 });
  });

  it('sin detalle no hay proyecto ni tipología', async () => {
    const { instancia } = await abrir(null);
    expect(instancia.proyectoId()).toBeNull();
    expect(instancia.casa()).toBeNull();
    expect(instancia.imagenes()).toEqual([]);
  });
});
