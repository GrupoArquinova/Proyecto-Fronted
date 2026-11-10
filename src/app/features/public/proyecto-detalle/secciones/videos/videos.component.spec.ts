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
import { VideosPublicoComponent } from './videos.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const video = (id: number, extra: object = {}) =>
  ({ id, tipo: 'VIDEO', url: `https://x.com/v${id}.mp4`, portada: false, publicado: true, activo: true, ...extra }) as never;

const detalle = (extra: Partial<ProyectoDetalle> = {}): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: null,
  zonasComunes: [], casasModelo: [], lotes: [], multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: [],
  ...extra
});

async function abrir(datos: ProyectoDetalle | null, consulta = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proyectos/:id/videos', component: VideosPublicoComponent }, { path: '**', component: Vacio }]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/videos${consulta}`, VideosPublicoComponent);
  harness.detectChanges();
  return { harness, instancia, el: harness.routeNativeElement as HTMLElement };
}

describe('VideosPublicoComponent', () => {
  it('sin detalle no pinta nada', async () => {
    const { el } = await abrir(null);
    expect(el.querySelector('section')).toBeNull();
  });

  it('con un solo video lo muestra con su título, descripción y pie, sin lista', async () => {
    const { el } = await abrir(detalle({ multimedia: [video(1, { titulo: 'Recorrido', descripcion: 'Vista general' })] }));
    expect(el.querySelector('h2')?.textContent).toBe('Recorrido');
    expect(el.querySelector('video')?.getAttribute('src')).toBe('https://x.com/v1.mp4');
    expect(el.querySelector('.descripcion')?.textContent).toBe('Vista general');
    expect(el.querySelector('.pie')?.textContent).toBe('Video del proyecto · La Hacienda');
    expect(el.querySelector('.lista')).toBeNull();
  });

  it('un video sin título ni descripción usa los textos por defecto', async () => {
    const { el } = await abrir(detalle({ multimedia: [video(1)] }));
    expect(el.querySelector('h2')?.textContent).toBe('Video del proyecto');
    expect(el.querySelector('video')?.getAttribute('aria-label')).toBe('video del proyecto');
    expect(el.querySelector('.descripcion')).toBeNull();
  });

  it('con varios videos ofrece una lista y al elegir uno lo reproduce', async () => {
    const { el, instancia, harness } = await abrir(detalle({ multimedia: [video(1, { titulo: 'Uno' }), video(2), video(3, { titulo: 'Tres' })] }));
    const botones = Array.from(el.querySelectorAll<HTMLButtonElement>('.lista button'));
    expect(botones.map(b => b.textContent?.trim())).toEqual(['Uno', 'Video 2', 'Tres']);
    expect(botones[0].classList.contains('activo')).toBe(true);

    botones[2].click();
    harness.detectChanges();

    expect(instancia.seleccionado()).toBe(2);
    expect(el.querySelector('h2')?.textContent).toBe('Tres');
    expect(el.querySelector('video')?.getAttribute('src')).toBe('https://x.com/v3.mp4');
    expect(el.querySelectorAll('.lista button')[2].classList.contains('activo')).toBe(true);
  });

  it('si el índice elegido ya no existe vuelve al primer video', async () => {
    const { instancia, harness } = await abrir(detalle({ multimedia: [video(1)] }));
    instancia.seleccionado.set(5);
    harness.detectChanges();
    expect(instancia.video()?.id).toBe(1);
  });

  it('la vista "cómo llegar" muestra el video de la ubicación y su pie', async () => {
    const { el } = await abrir(detalle({
      multimedia: [video(1)],
      ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', videoComoLlegarUrl: 'https://x.com/llegar.mp4' }
    }), '?vista=como-llegar');
    expect(el.querySelector('h2')?.textContent).toBe('¿Cómo llegar?');
    expect(el.querySelector('video')?.getAttribute('src')).toBe('https://x.com/llegar.mp4');
    expect(el.querySelector('.pie')?.textContent).toBe('Video de cómo llegar · La Hacienda');
  });

  it('la vista del proyecto sigue disponible con el video de cómo llegar cargado', async () => {
    const { el } = await abrir(detalle({
      multimedia: [video(1, { titulo: 'Principal' })],
      ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', videoComoLlegarUrl: 'https://x.com/llegar.mp4' }
    }), '?vista=proyecto');
    expect(el.querySelector('h2')?.textContent).toBe('Principal');
  });
});
