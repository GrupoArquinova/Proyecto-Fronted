import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { PlanoPuntosComponent, PosicionPlano360 } from './plano-puntos.component';

const puntos: Punto360[] = [
  { id: 1, proyectoId: 6, escena: 'URBANISMO', etiqueta: 'Etapa 1', etapaId: 3, posX: 25, posY: 40 },
  { id: 2, proyectoId: 6, escena: 'URBANISMO', etiqueta: 'Sin ubicar', etapaId: 4 },
];

function crear(entradas: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(PlanoPuntosComponent);
  fixture.componentRef.setInput('url', 'https://img.test/plano.png');
  fixture.componentRef.setInput('puntos', puntos);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, c: fixture.componentInstance };
}

describe('PlanoPuntosComponent', () => {
  it('muestra el plano y un botón por cada punto ya ubicado, en su porcentaje', () => {
    const { el } = crear({ titulo: 'Plano de El Encanto' });

    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://img.test/plano.png');
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Plano de El Encanto');
    const pines = el.querySelectorAll<HTMLElement>('.pin');
    expect(pines.length).toBe(1);
    expect(pines[0].textContent).toContain('Etapa 1');
    expect(pines[0].style.left).toBe('25%');
    expect(pines[0].style.top).toBe('40%');
  });

  it('sin título usa el texto alternativo de siempre', () => {
    const { el } = crear();
    expect(el.querySelector('img')?.getAttribute('alt')).toBeTruthy();
  });

  it('pulsar un botón avisa cuál se eligió y no cuenta como clic en el plano', () => {
    const { el, c } = crear();
    const elegidos: Punto360[] = [];
    const clics: PosicionPlano360[] = [];
    c.puntoElegido.subscribe(p => elegidos.push(p));
    c.clicEnPlano.subscribe(p => clics.push(p));

    el.querySelector<HTMLButtonElement>('.pin')?.click();

    expect(elegidos.map(p => p.id)).toEqual([1]);
    expect(clics).toEqual([]);
  });

  it('un clic en un lugar libre avisa la posición en porcentaje (para colocar botones en el editor)', () => {
    const { c } = crear();
    const clics: PosicionPlano360[] = [];
    c.clicEnPlano.subscribe(p => clics.push(p));
    const caja = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 200 }) };

    c.clic({ currentTarget: caja, clientX: 200, clientY: 100 } as unknown as MouseEvent);
    c.clic({ currentTarget: caja, clientX: 233, clientY: 77 } as unknown as MouseEvent);

    expect(clics).toEqual([{ x: 25, y: 25 }, { x: 33.25, y: 13.5 }]);
  });

  it('dibuja la marca temporal del editor y se pone a pantalla completa con "completo"', () => {
    const { el, fixture } = crear({ pendiente: { x: 60, y: 30 }, completo: true });

    const marca = el.querySelector<HTMLElement>('.pendiente');
    expect(marca?.style.left).toBe('60%');
    expect(marca?.style.top).toBe('30%');
    expect((fixture.nativeElement as HTMLElement).classList.contains('completo')).toBe(true);
  });
});
