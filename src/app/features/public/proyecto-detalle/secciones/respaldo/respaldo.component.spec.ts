import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { RespaldoPublicoComponent } from './respaldo.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const lamina = (id: number, orden: number) =>
  ({ id, tipo: 'RESPALDO', url: `https://x.com/r${id}.png`, orden, portada: false, publicado: true, activo: true }) as never;

const detalle = (multimedia: unknown[]): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: null,
  zonasComunes: [], casasModelo: [], lotes: [], multimedia: multimedia as never, multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: []
});

async function abrir(datos: ProyectoDetalle | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'proyectos/:id/respaldo', component: RespaldoPublicoComponent },
        { path: 'proyectos/:id/bienvenida', component: Vacio }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl('/proyectos/7/respaldo', RespaldoPublicoComponent);
  harness.detectChanges();
  return { instancia, router: TestBed.inject(Router), el: harness.routeNativeElement as HTMLElement };
}

describe('RespaldoPublicoComponent', () => {
  it('muestra las láminas de respaldo en un carrusel, en el orden del administrador', async () => {
    const { el, instancia } = await abrir(detalle([lamina(1, 2), lamina(2, 1)]));
    expect(instancia.laminas().map(l => l.id)).toEqual([2, 1]);
    expect(instancia.nombre()).toBe('La Hacienda');
    const carrusel = el.querySelector('app-carrusel-laminas')!;
    expect(carrusel.querySelector('section')?.getAttribute('aria-label')).toBe('Respaldo del proyecto');
    expect(carrusel.querySelector('img')?.getAttribute('src')).toBe('https://x.com/r2.png');
    expect(carrusel.querySelector('img')?.getAttribute('alt')).toBe('Respaldo de La Hacienda');
  });

  it('sin láminas no pinta carrusel y vuelve a Bienvenida porque la sección no existe', async () => {
    const { el, router } = await abrir(detalle([]));
    expect(el.querySelector('app-carrusel-laminas')).toBeNull();
    await vi.waitFor(() => expect(router.url).toBe('/proyectos/7/bienvenida'), { timeout: 5000 });
  });

  it('sin detalle el nombre queda vacío', async () => {
    const { instancia } = await abrir(null);
    expect(instancia.nombre()).toBe('');
    expect(instancia.laminas()).toEqual([]);
  });
});
