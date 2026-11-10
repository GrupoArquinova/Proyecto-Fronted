import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { Lote } from '../../../../../core/models/lote.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { PlanoLotesComponent } from './plano-lotes.component';

const lote = (id: number | undefined, codigo: string, extra: Partial<Lote> = {}): Lote =>
  ({ id, codigo, areaM2: 100, activo: true, estadoId: 1, estadoNombre: 'DISPONIBLE', ...extra });

function crear(entradas: { imagenUrl?: string | null; lotes: Lote[]; seleccionadoId?: number | null }) {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(PlanoLotesComponent);
  fixture.componentRef.setInput('lotes', entradas.lotes);
  if (entradas.imagenUrl !== undefined) fixture.componentRef.setInput('imagenUrl', entradas.imagenUrl);
  if (entradas.seleccionadoId !== undefined) fixture.componentRef.setInput('seleccionadoId', entradas.seleccionadoId);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, marcas: () => Array.from(el.querySelectorAll<HTMLButtonElement>('button.marca')) };
}

describe('PlanoLotesComponent', () => {
  it('sin imagen no dibuja el plano aunque haya lotes con posición', () => {
    const { el } = crear({ lotes: [lote(1, 'L1', { posicionX: 10, posicionY: 20 })] });
    expect(el.querySelector('.plano')).toBeNull();
  });

  it('con imagen pero sin lotes posicionados tampoco dibuja el plano', () => {
    const { el } = crear({ imagenUrl: 'https://x.com/plano.png', lotes: [lote(1, 'L1'), lote(2, 'L2', { posicionX: 5 })] });
    expect(el.querySelector('.plano')).toBeNull();
  });

  it('dibuja la imagen con su texto alternativo y un botón por lote posicionado', () => {
    const { el, marcas } = crear({
      imagenUrl: 'https://x.com/plano.png',
      lotes: [lote(1, 'L1', { posicionX: 10, posicionY: 20 }), lote(2, 'L2'), lote(3, 'L3', { posicionX: 70, posicionY: 80 })]
    });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://x.com/plano.png');
    expect(el.querySelector('img')?.alt).toBe('Plano del proyecto con la ubicación de los lotes');
    expect(marcas().map(m => m.textContent?.trim())).toEqual(['L1', 'L3']);
    expect(marcas()[0].style.left).toBe('10%');
    expect(marcas()[0].style.top).toBe('20%');
  });

  it('si todas las posiciones son fracciones entre 0 y 1 las escala a porcentaje', () => {
    const { marcas } = crear({
      imagenUrl: 'https://x.com/plano.png',
      lotes: [lote(1, 'L1', { posicionX: 0.25, posicionY: 0.5 }), lote(2, 'L2', { posicionX: 1, posicionY: 0.1 })]
    });
    expect(marcas().map(m => [m.style.left, m.style.top])).toEqual([['25%', '50%'], ['100%', '10%']]);
  });

  it('limita las posiciones fuera del plano al borde', () => {
    const { marcas } = crear({
      imagenUrl: 'https://x.com/plano.png',
      lotes: [lote(1, 'L1', { posicionX: -5, posicionY: 150 })]
    });
    expect(marcas()[0].style.left).toBe('0%');
    expect(marcas()[0].style.top).toBe('100%');
  });

  it('ignora los lotes sin id aunque tengan posición', () => {
    const { marcas } = crear({ imagenUrl: 'https://x.com/plano.png', lotes: [lote(undefined, 'SIN', { posicionX: 10, posicionY: 10 }), lote(1, 'L1', { posicionX: 20, posicionY: 20 })] });
    expect(marcas().map(m => m.textContent?.trim())).toEqual(['L1']);
  });

  it('cada marca lleva la clase de su estado y una etiqueta accesible con el estado traducido', () => {
    const { marcas } = crear({
      imagenUrl: 'https://x.com/plano.png',
      lotes: [
        lote(1, 'L1', { posicionX: 10, posicionY: 10 }),
        lote(2, 'L2', { posicionX: 20, posicionY: 20, estadoNombre: 'RESERVADO' }),
        lote(3, 'L3', { posicionX: 30, posicionY: 30, estadoNombre: 'VENDIDO' }),
        lote(4, 'L4', { posicionX: 40, posicionY: 40, estadoNombre: 'OTRO', estadoId: 9 })
      ]
    });
    expect(marcas().map(m => m.className.replace('marca', '').trim())).toEqual(['disponible', 'reservado', 'vendido', 'otro']);
    expect(marcas()[1].getAttribute('aria-label')).toBe('Lote L2, Reservado');
  });

  it('marca como activa solo el lote seleccionado', () => {
    const { marcas } = crear({
      imagenUrl: 'https://x.com/plano.png',
      seleccionadoId: 3,
      lotes: [lote(1, 'L1', { posicionX: 10, posicionY: 10 }), lote(3, 'L3', { posicionX: 30, posicionY: 30 })]
    });
    expect(marcas().map(m => m.classList.contains('activa'))).toEqual([false, true]);
  });

  it('al pulsar una marca emite el lote completo', () => {
    const { fixture, marcas } = crear({
      imagenUrl: 'https://x.com/plano.png',
      lotes: [lote(1, 'L1', { posicionX: 10, posicionY: 10 }), lote(3, 'L3', { posicionX: 30, posicionY: 30 })]
    });
    const emitidos: Lote[] = [];
    fixture.componentInstance.seleccionar.subscribe(l => emitidos.push(l));

    marcas()[1].click();

    expect(emitidos.map(l => l.codigo)).toEqual(['L3']);
  });
});
