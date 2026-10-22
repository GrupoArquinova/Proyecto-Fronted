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
import { DisponibilidadPublicoComponent } from './disponibilidad.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const lote = (id: number, codigo: string, etapaId: number | undefined, extra: Partial<Lote> = {}): Lote =>
  ({ id, codigo, areaM2: 800, activo: true, estadoId: 1, estadoNombre: 'DISPONIBLE', proyectoId: 7, etapaId, etapaNombre: etapaId ? `Etapa ${etapaId}` : undefined, ...extra });

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
        { path: 'proyectos/:id/disponibilidad', component: DisponibilidadPublicoComponent },
        { path: 'proyectos/:id/bienvenida', component: Vacio }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService,
      { provide: MultimediaService, useValue: { listarPublicadosPorEntidad: vi.fn(() => of([])) } }
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/disponibilidad${consulta}`, DisponibilidadPublicoComponent);
  harness.detectChanges();
  return { harness, instancia, router: TestBed.inject(Router), el: harness.routeNativeElement as HTMLElement };
}

describe('DisponibilidadPublicoComponent', () => {
  const lotes = () => [
    lote(1, 'A1', 1, { areaM2: 1100 }),
    lote(2, 'A2', 1, { estadoNombre: 'RESERVADO' }),
    lote(3, 'A3', 1, { estadoNombre: 'VENDIDO' }),
    lote(4, 'A4', 1),
    lote(5, 'B1', 2)
  ];

  it('muestra la primera etapa por defecto con su nombre, solo sus lotes y la leyenda con conteos', async () => {
    const { el, instancia } = await abrir(detalle(lotes()));
    expect(el.querySelector('h2')?.textContent).toBe('Etapa 1');
    expect(instancia.etapaId()).toBe(1);
    expect(Array.from(el.querySelectorAll('.grilla button strong')).map(b => b.textContent)).toEqual(['A1', 'A2', 'A3', 'A4']);
    const leyenda = Array.from(el.querySelectorAll('.leyenda li')).map(li => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(leyenda).toEqual(['Disponible 2', 'Reservado 1', 'Vendido 1']);
  });

  it('con ?vista=<etapa> muestra esa etapa', async () => {
    const { el } = await abrir(detalle(lotes()), '?vista=2');
    expect(el.querySelector('h2')?.textContent).toBe('Etapa 2');
    expect(Array.from(el.querySelectorAll('.grilla button strong')).map(b => b.textContent)).toEqual(['B1']);
    expect(Array.from(el.querySelectorAll('.leyenda strong')).map(s => s.textContent)).toEqual(['1', '0', '0']);
  });

  it('cada botón muestra el área formateada y la clase del estado', async () => {
    const { el } = await abrir(detalle(lotes()));
    const botones = Array.from(el.querySelectorAll<HTMLButtonElement>('.grilla button'));
    expect(botones[0].querySelector('span')?.textContent).toBe('1.100 m²');
    expect(botones.map(b => ['disponible', 'reservado', 'vendido'].find(k => b.classList.contains(k)))).toEqual(['disponible', 'reservado', 'vendido', 'disponible']);
  });

  it('al inicio pide elegir un lote y no hay ficha', async () => {
    const { el, instancia } = await abrir(detalle(lotes()));
    expect(el.querySelector('.ayuda')?.textContent).toBe('Elige un lote para ver su ficha.');
    expect(el.querySelector('app-lote-tarjeta')).toBeNull();
    expect(instancia.elegido()).toBeNull();
  });

  it('pulsar un lote abre su ficha y volver a pulsarlo la cierra', async () => {
    const { el, harness } = await abrir(detalle(lotes()));
    const botones = () => el.querySelectorAll<HTMLButtonElement>('.grilla button');

    botones()[1].click();
    harness.detectChanges();
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('A2');
    expect(botones()[1].classList.contains('activo')).toBe(true);
    expect(el.querySelector('.ayuda')).toBeNull();

    botones()[2].click();
    harness.detectChanges();
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('A3');

    botones()[2].click();
    harness.detectChanges();
    expect(el.querySelector('app-lote-tarjeta')).toBeNull();
    expect(el.querySelector('.ayuda')).not.toBeNull();
  });

  it('el lote elegido solo vale para la etapa que se está viendo', async () => {
    const { el, harness, instancia, router } = await abrir(detalle(lotes()));
    el.querySelectorAll<HTMLButtonElement>('.grilla button')[0].click();
    harness.detectChanges();
    expect(instancia.elegido()?.codigo).toBe('A1');

    await harness.navigateByUrl('/proyectos/7/disponibilidad?vista=2', DisponibilidadPublicoComponent);
    harness.detectChanges();
    expect(router.url).toContain('vista=2');
    expect(instancia.elegido()).toBeNull();
    expect(el.querySelector('app-lote-tarjeta')).toBeNull();
  });

  it('una marca del plano abre la ficha del lote', async () => {
    const conPlano = [lote(1, 'A1', 1, { posicionX: 10, posicionY: 10 }), lote(2, 'A2', 1, { posicionX: 60, posicionY: 60 })];
    const { el, harness } = await abrir(detalle(conPlano, {
      multimedia: [{ tipo: 'PLANO', url: 'https://x.com/plano.png', portada: false, publicado: true, activo: true } as never]
    }));
    el.querySelectorAll<HTMLButtonElement>('app-plano-lotes button.marca')[1].click();
    harness.detectChanges();
    expect(el.querySelector('app-lote-tarjeta h3')?.textContent).toBe('A2');
    expect(el.querySelector('app-plano-lotes button.marca.activa')?.textContent?.trim()).toBe('A2');
  });

  it('los lotes sin etapa no generan la sección ni vistas: vuelve a Bienvenida', async () => {
    const { router } = await abrir(detalle([]));
    await vi.waitFor(() => expect(router.url).toBe('/proyectos/7/bienvenida'), { timeout: 5000 });
  });

  it('con lotes sin etapa la sección existe pero queda sin vistas ni título (etapa 0)', async () => {
    const { el, instancia } = await abrir(detalle([lote(1, 'X1', undefined)]));
    expect(instancia.etapaId()).toBe(0);
    expect(instancia.etapaNombre()).toBe('');
    expect(el.querySelector('h2')?.textContent).toBe('');
    expect(el.querySelectorAll('.grilla button').length).toBe(0);
  });

  it('sin detalle no pinta nada', async () => {
    const { el } = await abrir(null);
    expect(el.querySelector('section')).toBeNull();
  });
});
