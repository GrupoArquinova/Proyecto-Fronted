import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { BienvenidaComponent } from './bienvenida.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const mm = (extra: object) => ({ tipo: 'IMAGEN', url: 'https://x.com/a.png', portada: false, publicado: true, activo: true, ...extra }) as never;

const detalle = (extra: Partial<ProyectoDetalle> = {}): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda', descripcion: 'Un proyecto campestre', imagenUrl: 'https://x.com/portada.jpg' },
  ubicacion: { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá' },
  zonasComunes: [], casasModelo: [], lotes: [], multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: [],
  ...extra
});

async function abrir(datos: ProyectoDetalle | null, consulta = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proyectos/:id/bienvenida', component: BienvenidaComponent }, { path: '**', component: Vacio }]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/proyectos/7/bienvenida${consulta}`, BienvenidaComponent);
  harness.detectChanges();
  return harness.routeNativeElement as HTMLElement;
}

describe('BienvenidaComponent', () => {
  it('sin detalle no pinta nada', async () => {
    const el = await abrir(null);
    expect(el.querySelector('section')).toBeNull();
  });

  describe('portada', () => {
    it('muestra la etiqueta con el departamento, el nombre, la descripción y la foto de fondo', async () => {
      const el = await abrir(detalle());
      const hero = el.querySelector<HTMLElement>('.hero')!;
      expect(el.querySelector('.etiqueta')?.textContent).toBe('ARQUINOVA · Boyacá');
      expect(el.querySelector('h2')?.textContent).toBe('La Hacienda');
      expect(el.querySelector('.hero-contenido p')?.textContent).toBe('Un proyecto campestre');
      expect(hero.style.backgroundImage).toContain('portada.jpg');
    });

    it('sin departamento usa la ciudad y sin ubicación solo la marca', async () => {
      const conCiudad = await abrir(detalle({ ubicacion: { proyectoId: 7, ciudad: 'Tunja', departamento: undefined as never } }));
      expect(conCiudad.querySelector('.etiqueta')?.textContent).toBe('ARQUINOVA · Tunja');
      TestBed.resetTestingModule();
      const sinUbicacion = await abrir(detalle({ ubicacion: null }));
      expect(sinUbicacion.querySelector('.etiqueta')?.textContent).toBe('ARQUINOVA');
    });

    it('sin descripción ni imagen no muestra párrafo ni fondo', async () => {
      const el = await abrir(detalle({ proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' } }));
      expect(el.querySelector('.hero-contenido p')).toBeNull();
      expect(el.querySelector<HTMLElement>('.hero')!.style.backgroundImage).toBe('');
    });

    it('una vista inexistente en el menú deja la portada', async () => {
      const el = await abrir(detalle(), '?vista=video');
      expect(el.querySelector('.hero')).not.toBeNull();
    });
  });

  describe('galería', () => {
    it('muestra el carrusel con las imágenes del proyecto', async () => {
      const el = await abrir(detalle({ multimedia: [mm({ id: 1, url: 'https://x.com/1.png' }), mm({ id: 2, url: 'https://x.com/2.png', orden: 2 })] }), '?vista=galeria');
      expect(el.querySelector('app-carrusel-laminas')).not.toBeNull();
      expect(el.querySelector<HTMLImageElement>('app-carrusel-laminas img')?.alt).toBe('La Hacienda');
      expect(el.querySelector<HTMLImageElement>('app-carrusel-laminas img')?.getAttribute('src')).toBe('https://x.com/1.png');
      expect(el.querySelector('.hero')).toBeNull();
    });
  });

  describe('beneficios', () => {
    it('con varias láminas las pasa en un carrusel', async () => {
      const el = await abrir(detalle({ multimedia: [mm({ id: 1, tipo: 'BENEFICIOS', url: 'https://x.com/b1.png', orden: 1 }), mm({ id: 2, tipo: 'BENEFICIOS', url: 'https://x.com/b2.png', orden: 2 })] }), '?vista=beneficios');
      expect(el.querySelector('app-carrusel-laminas')).not.toBeNull();
      expect(el.querySelector<HTMLImageElement>('app-carrusel-laminas img')?.alt).toBe('Beneficios de La Hacienda');
      expect(el.querySelector('.lamina')).toBeNull();
    });

    it('con una sola lámina la muestra como imagen con su fondo', async () => {
      const el = await abrir(detalle({ multimedia: [mm({ id: 1, tipo: 'BENEFICIOS', url: 'https://x.com/b1.png' })] }), '?vista=beneficios');
      const img = el.querySelector<HTMLImageElement>('.lamina-imagen img')!;
      expect(img.getAttribute('src')).toBe('https://x.com/b1.png');
      expect(img.alt).toBe('Beneficios de La Hacienda');
      expect(el.querySelector<HTMLElement>('.lamina-fondo')!.style.backgroundImage).toContain('b1.png');
      expect(el.querySelector('.lamina')?.getAttribute('aria-label')).toBe('Beneficios del proyecto');
    });

    it('sin lámina muestra el texto institucional BENEFICIOS (sin importar mayúsculas)', async () => {
      const el = await abrir(detalle({ contenido: [{ id: 1, empresaId: 1, seccion: 'beneficios', titulo: 'Por qué elegirnos', contenido: 'Naturaleza y seguridad', publicado: true } as never] }), '?vista=beneficios');
      expect(el.querySelector('.bloque h2')?.textContent).toBe('Por qué elegirnos');
      expect(el.querySelector('.bloque .texto')?.textContent).toBe('Naturaleza y seguridad');
      expect(el.querySelector('.lamina')).toBeNull();
    });
  });

  describe('video', () => {
    it('reproduce el primer video del proyecto sobre la portada, con su título', async () => {
      const el = await abrir(detalle({ multimedia: [mm({ id: 1, tipo: 'VIDEO', url: 'https://x.com/v.mp4', titulo: 'Recorrido' })] }), '?vista=video');
      const video = el.querySelector<HTMLVideoElement>('.pantalla-video app-medio video')!;
      expect(video.getAttribute('src')).toBe('https://x.com/v.mp4');
      expect(video.getAttribute('aria-label')).toBe('Recorrido');
      expect(el.querySelector<HTMLElement>('.pantalla-video')!.style.backgroundImage).toContain('portada.jpg');
      expect(el.querySelector('app-medio')?.classList.contains('completo')).toBe(true);
    });

    it('sin título usa el texto por defecto y sin imagen de proyecto no pone fondo', async () => {
      const el = await abrir(detalle({
        proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
        multimedia: [mm({ id: 1, tipo: 'VIDEO', url: 'https://x.com/v.mp4' })]
      }), '?vista=video');
      expect(el.querySelector('video')?.getAttribute('aria-label')).toBe('video del proyecto');
      expect(el.querySelector<HTMLElement>('.pantalla-video')!.style.backgroundImage).toBe('');
    });
  });
});
