import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { Lote } from '../../../../../core/models/lote.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { LotesPublicoComponent } from './lotes.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const lote = (id: number, codigo: string, extra: Partial<Lote> = {}): Lote =>
  ({ id, codigo, areaM2: 800, activo: true, estadoId: 1, estadoNombre: 'DISPONIBLE', proyectoId: 7, ...extra });

const detalle = (lotes: Lote[], extra: Partial<ProyectoDetalle> = {}): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: null,
  zonasComunes: [], casasModelo: [], lotes, multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: [],
  ...extra
});

async function abrir(datos: ProyectoDetalle | null, consulta = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'proyectos/:id/lotes', component: LotesPublicoComponent },
        { path: 'proyectos/:id/bienvenida', component: Vacio }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService,
      { provide: MultimediaService, useValue: { listarPublicadosPorEntidad: vi.fn(() => of([])) } }
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/lotes${consulta}`, LotesPublicoComponent);
  harness.detectChanges();
  return { harness, instancia, router: TestBed.inject(Router), el: harness.routeNativeElement as HTMLElement };
}

describe('LotesPublicoComponent', () => {
  const tres = () => [
    lote(1, 'L1', { areaM2: 800 }),
    lote(2, 'L2', { areaM2: 1100, estadoNombre: 'RESERVADO' }),
    lote(3, 'L3', { areaM2: 420.5, estadoNombre: 'VENDIDO' })
  ];

  it('muestra el resumen con el total de lotes y cuántos están disponibles', async () => {
    const { el } = await abrir(detalle(tres()));
    expect(el.querySelector('h2')?.textContent).toBe('Lotes');
    expect(el.querySelector('.resumen')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('3 lotes · 1 disponible');
  });

  it('usa el singular con un solo lote y el plural con varios disponibles', async () => {
    const uno = await abrir(detalle([lote(1, 'L1', { estadoNombre: 'RESERVADO' })]));
    expect(uno.el.querySelector('.resumen')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1 lote · 0 disponibles');
    TestBed.resetTestingModule();
    const varios = await abrir(detalle([lote(1, 'L1'), lote(2, 'L2')]));
    expect(varios.el.querySelector('.resumen')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('2 lotes · 2 disponibles');
  });

  it('lista un chip por lote con su código, área y clase de estado', async () => {
    const { el } = await abrir(detalle(tres()));
    const chips = Array.from(el.querySelectorAll<HTMLAnchorElement>('.chips a'));
    expect(chips.map(c => c.querySelector('strong')?.textContent)).toEqual(['L1', 'L2', 'L3']);
    expect(chips.map(c => c.querySelector('span')?.textContent)).toEqual(['800 m²', '1.100 m²', '420,5 m²']);
    expect(chips.map(c => ['disponible', 'reservado', 'vendido'].find(k => c.classList.contains(k)))).toEqual(['disponible', 'reservado', 'vendido']);
    expect(chips[1].getAttribute('href')).toContain('vista=2');
  });

  it('sin vista elegida selecciona el primer lote y muestra su ficha', async () => {
    const { el, instancia } = await abrir(detalle(tres()));
    expect(instancia.seleccionado()?.codigo).toBe('L1');
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('L1');
    expect(el.querySelectorAll('.chips a.activo').length).toBe(1);
    expect(el.querySelector('.chips a.activo strong')?.textContent).toBe('L1');
  });

  it('con ?vista=<id> selecciona ese lote', async () => {
    const { el } = await abrir(detalle(tres()), '?vista=3');
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('L3');
    expect(el.querySelector('.chips a.activo strong')?.textContent).toBe('L3');
  });

  it('una vista que no corresponde a ningún lote cae al primero', async () => {
    const { el } = await abrir(detalle(tres()), '?vista=99');
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('L1');
  });

  it('elegir un lote navega al mismo URL con su id como vista, conservando los demás parámetros', async () => {
    const { instancia, router, harness, el } = await abrir(detalle(tres()), '?otro=1');
    instancia.elegir(tres()[1]);
    await vi.waitFor(() => expect(router.url).toContain('vista=2'), { timeout: 5000 });
    harness.detectChanges();
    expect(router.url).toContain('otro=1');
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('L2');
  });

  it('el plano de lotes aparece cuando hay imagen y lotes posicionados, y pulsar una marca cambia el lote', async () => {
    const lotes = [lote(1, 'L1', { posicionX: 10, posicionY: 10 }), lote(2, 'L2', { posicionX: 50, posicionY: 50 })];
    const { el, harness, router } = await abrir(detalle(lotes, {
      multimedia: [{ tipo: 'PLANO', url: 'https://x.com/plano.png', portada: false, publicado: true, activo: true } as never]
    }));
    const marcas = el.querySelectorAll<HTMLButtonElement>('app-plano-lotes button.marca');
    expect(marcas.length).toBe(2);

    marcas[1].click();
    await vi.waitFor(() => expect(router.url).toContain('vista=2'), { timeout: 5000 });
    harness.detectChanges();
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('L2');
    expect(el.querySelector('app-plano-lotes button.marca.activa')?.textContent?.trim()).toBe('L2');
  });

  it('sin lotes la sección no existe y vuelve a Bienvenida (así pasa con datos simulados con "lotes: []")', async () => {
    const { router, el } = await abrir(detalle([]));
    expect(el.querySelectorAll('.chips li').length).toBe(0);
    await vi.waitFor(() => expect(router.url).toBe('/proyectos/7/bienvenida'), { timeout: 5000 });
  });

  it('sin detalle no pinta nada y no redirige', async () => {
    const { router, el } = await abrir(null);
    expect(el.querySelector('section')).toBeNull();
    expect(router.url).toBe('/proyectos/7/lotes');
  });
});
