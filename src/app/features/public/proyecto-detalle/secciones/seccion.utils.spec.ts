import { Component, PLATFORM_ID, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi } from 'vitest';
import { ProyectoDetalleService } from '../../../../core/services/proyecto-detalle.service';
import { ProyectoDetalle } from '../../../../core/models/proyecto-detalle.models';
import { provideI18nPruebas } from '../../../../i18n/pruebas';
import { inicializarSeccion } from './seccion.utils';

@Component({ selector: 'app-prueba-ubicacion', standalone: true, template: '<p class="vista">{{ vista() ?? "ninguna" }}</p>' })
class UbicacionPrueba {
  readonly seccion = inicializarSeccion('ubicacion');
  readonly vista = this.seccion.vista;
}

@Component({ selector: 'app-prueba-portada', standalone: true, template: '<p class="vista">{{ vista() ?? "ninguna" }}</p>' })
class PortadaPrueba {
  readonly vista = inicializarSeccion('bienvenida', { primeraPorDefecto: false }).vista;
}

@Component({ selector: 'app-prueba-destino', standalone: true, template: '<p class="destino">Bienvenida</p>' })
class Destino {}

const detalle = (conUbicacion: boolean): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: conUbicacion ? { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá', recorrido360Url: 'x', googleMapsUrl: 'y' } : null,
  zonasComunes: [], casasModelo: [], lotes: [], multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: []
});

async function abrir(datos: ProyectoDetalle | null, url: string, extra: Provider[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'proyectos/:id/ubicacion', component: UbicacionPrueba },
        { path: 'proyectos/:id/bienvenida', component: PortadaPrueba },
        { path: 'proyectos/:id/otra', component: Destino }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService, ...extra
    ]
  });
  const servicio = TestBed.inject(ProyectoDetalleService);
  servicio.detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const componente = url.includes('/bienvenida') ? PortadaPrueba : UbicacionPrueba;
  await harness.navigateByUrl(url, componente);
  harness.detectChanges();
  await harness.fixture.whenStable();
  return { harness, servicio, router: TestBed.inject(Router), vista: () => harness.routeNativeElement?.querySelector('.vista')?.textContent };
}

describe('inicializarSeccion', () => {
  it('toma como vista activa la que llega en el query param si existe en el menú', async () => {
    const { vista } = await abrir(detalle(true), '/proyectos/7/ubicacion?vista=google-maps');
    expect(vista()).toBe('google-maps');
  });

  it('sin query param usa la primera vista disponible', async () => {
    const { vista } = await abrir(detalle(true), '/proyectos/7/ubicacion');
    expect(vista()).toBe('entorno-360');
  });

  it('con una vista que no existe cae a la primera', async () => {
    const { vista } = await abrir(detalle(true), '/proyectos/7/ubicacion?vista=inventada');
    expect(vista()).toBe('entorno-360');
  });

  it('con primeraPorDefecto en falso, sin vista válida queda en null (portada)', async () => {
    const { vista } = await abrir(detalle(true), '/proyectos/7/bienvenida?vista=inventada');
    expect(vista()).toBe('ninguna');
  });

  it('la vista sigue los cambios del query param sin recrear el componente', async () => {
    const { harness, vista } = await abrir(detalle(true), '/proyectos/7/ubicacion?vista=google-maps');
    await harness.navigateByUrl('/proyectos/7/ubicacion?vista=entorno-360', UbicacionPrueba);
    harness.detectChanges();
    expect(vista()).toBe('entorno-360');
  });

  it('entrega el detalle localizado del servicio', async () => {
    const { harness } = await abrir(detalle(true), '/proyectos/7/ubicacion');
    const instancia = harness.routeDebugElement!.componentInstance as UbicacionPrueba;
    expect(instancia.seccion.detalle()?.proyecto.nombre).toBe('La Hacienda');
    expect(instancia.seccion.datos).toBe(TestBed.inject(ProyectoDetalleService));
  });

  it('si la sección no tiene contenido vuelve a Bienvenida del mismo proyecto reemplazando la URL', async () => {
    const { router } = await abrir(detalle(false), '/proyectos/7/ubicacion');
    await vi.waitFor(() => expect(router.url).toBe('/proyectos/7/bienvenida'), { timeout: 5000 });
  });

  it('mientras el detalle no ha cargado no redirige', async () => {
    const { router } = await abrir(null, '/proyectos/7/ubicacion');
    expect(router.url).toBe('/proyectos/7/ubicacion');
  });

  it('en el servidor no redirige aunque la sección no exista', async () => {
    const { router } = await abrir(detalle(false), '/proyectos/7/ubicacion', [{ provide: PLATFORM_ID, useValue: 'server' }]);
    await new Promise(resolver => setTimeout(resolver, 0));
    expect(router.url).toBe('/proyectos/7/ubicacion');
  });
});
