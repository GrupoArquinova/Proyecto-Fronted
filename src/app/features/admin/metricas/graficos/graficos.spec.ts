import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BarrasApiladasComponent, FilaApilada } from './barras-apiladas.component';
import { BarrasHorizontalesComponent, ItemBarra } from './barras-horizontales.component';
import { GraficoSerieComponent, PuntoSerie } from './grafico-serie.component';

function montar<T>(tipo: new () => T, entradas: Record<string, unknown>) {
  const fixture = TestBed.createComponent(tipo);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('BarrasHorizontalesComponent', () => {
  it('una fila por elemento, con el valor en texto y la barra proporcional al máximo', () => {
    const items: ItemBarra[] = [{ etiqueta: 'A', valor: 10 }, { etiqueta: 'B', valor: 5 }, { etiqueta: 'C', valor: 0 }];
    const { el } = montar(BarrasHorizontalesComponent, { items, titulo: 'Prueba' });
    const filas = Array.from(el.querySelectorAll('li'));
    expect(filas).toHaveLength(3);
    expect(el.querySelector('ul')?.getAttribute('aria-label')).toBe('Prueba');
    const anchos = Array.from(el.querySelectorAll<HTMLElement>('.barra')).map((b) => b.style.width);
    expect(anchos).toEqual(['100%', '50%', '0%']);
    expect(filas[1].querySelector('.valor')?.textContent?.trim()).toBe('5');
    expect(el.querySelector('.pista')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('con base muestra el porcentaje; con base 0 muestra 0% (nunca NaN)', () => {
    const items: ItemBarra[] = [{ etiqueta: 'A', valor: 10 }, { etiqueta: 'B', valor: 5 }];
    const con = montar(BarrasHorizontalesComponent, { items, base: 20 });
    expect(con.el.textContent).toContain('(50%)');
    expect(con.el.textContent).toContain('(25%)');
    TestBed.resetTestingModule();
    const cero = montar(BarrasHorizontalesComponent, { items, base: 0 });
    expect(cero.el.textContent).toContain('(0%)');
    expect(cero.el.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('sin datos (o todo en cero) muestra el mensaje vacío', () => {
    const vacio = montar(BarrasHorizontalesComponent, { items: [], vacio: 'Nada por aquí' });
    expect(vacio.el.textContent).toContain('Nada por aquí');
    TestBed.resetTestingModule();
    const ceros = montar(BarrasHorizontalesComponent, { items: [{ etiqueta: 'A', valor: 0 }] });
    expect(ceros.el.querySelector('ul')).toBeNull();
    expect(ceros.el.textContent).toContain('Sin datos');
  });
});

describe('BarrasApiladasComponent', () => {
  const filas: FilaApilada[] = [
    { etiqueta: 'El Encanto', segmentos: [{ nombre: 'Disponibles', valor: 6, color: '#0a0' }, { nombre: 'Vendidos', valor: 2, color: '#888' }] },
    { etiqueta: 'La Hacienda', segmentos: [{ nombre: 'Disponibles', valor: 2, color: '#0a0' }, { nombre: 'Vendidos', valor: 0, color: '#888' }] }
  ];

  it('apila los tramos con una escala común, con leyenda y texto para lectores de pantalla', () => {
    const { el } = montar(BarrasApiladasComponent, { items: filas, titulo: 'Lotes' });
    const primera = Array.from(el.querySelectorAll<HTMLElement>('.filas li')[0].querySelectorAll<HTMLElement>('.segmento')).map((s) => s.style.width);
    expect(primera).toEqual(['75%', '25%']);
    const segunda = Array.from(el.querySelectorAll<HTMLElement>('.filas li')[1].querySelectorAll<HTMLElement>('.segmento')).map((s) => s.style.width);
    expect(segunda).toEqual(['25%', '0%']);
    expect(el.querySelector('.filas li .solo-lectores')?.textContent).toBe('El Encanto: 6 disponibles, 2 vendidos. Total 8.');
    expect(el.querySelector('.leyenda')?.textContent?.replace(/\s+/g, ' ')).toContain('Disponibles: 8');
    expect(el.querySelector('.leyenda')?.textContent?.replace(/\s+/g, ' ')).toContain('Vendidos: 2');
  });

  it('sin lotes muestra el mensaje vacío', () => {
    const { el } = montar(BarrasApiladasComponent, { items: [], vacio: 'Sin lotes' });
    expect(el.textContent).toContain('Sin lotes');
    TestBed.resetTestingModule();
    const ceros = montar(BarrasApiladasComponent, { items: [{ etiqueta: 'X', segmentos: [{ nombre: 'Disponibles', valor: 0, color: '#000' }] }], vacio: 'Sin lotes' });
    expect(ceros.el.textContent).toContain('Sin lotes');
    expect(ceros.el.textContent).not.toMatch(/NaN/);
  });
});

describe('GraficoSerieComponent', () => {
  const puntos: PuntoSerie[] = [
    { etiqueta: '5 oct', valor: 3, detalle: 'Semana del 5 oct' }, { etiqueta: '12 oct', valor: 0 }, { etiqueta: '19 oct', valor: 7 }
  ];

  it('barras: una por punto, con resumen accesible y tabla alternativa', () => {
    const { el } = montar(GraficoSerieComponent, { puntos, tipo: 'barras', titulo: 'Solicitudes por semana', unidad: 'solicitudes' });
    expect(el.querySelectorAll('rect')).toHaveLength(3);
    const resumen = el.querySelector('svg')!.getAttribute('aria-label')!;
    expect(resumen).toContain('Solicitudes por semana');
    expect(resumen).toContain('Total: 10 solicitudes');
    expect(resumen).toContain('valor más alto es 7');
    const filas = Array.from(el.querySelectorAll('tbody tr')).map((f) => f.textContent?.replace(/\s+/g, ' ').trim());
    expect(filas).toEqual(['Semana del 5 oct3', '12 oct0', '19 oct7']);
    // No hay valores NaN en las coordenadas
    expect(el.querySelector('svg')!.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('línea: polilínea, área y un punto por dato', () => {
    const { el } = montar(GraficoSerieComponent, { puntos, tipo: 'linea', titulo: 'Visitas' });
    expect(el.querySelector('polyline')?.getAttribute('points')?.split(' ')).toHaveLength(3);
    expect(el.querySelector('path[fill-opacity]')?.getAttribute('d')).toMatch(/^M.*Z$/);
    expect(el.querySelectorAll('circle')).toHaveLength(3);
    expect(el.querySelector('svg')!.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('un solo punto en línea se centra sin dividir por cero', () => {
    const { el } = montar(GraficoSerieComponent, { puntos: [{ etiqueta: 'hoy', valor: 4 }], tipo: 'linea', titulo: 'Uno' });
    expect(el.querySelector('svg')!.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(el.querySelectorAll('circle')).toHaveLength(1);
  });

  it('las marcas del eje son enteras y el tope cubre el máximo', () => {
    const { fixture } = montar(GraficoSerieComponent, { puntos: [{ etiqueta: 'a', valor: 3 }], tipo: 'barras', titulo: 'T' });
    const marcas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.eje-y')).map((t) => Number(t.textContent));
    expect(marcas.every(Number.isInteger)).toBe(true);
    expect(Math.max(...marcas)).toBeGreaterThanOrEqual(3);
  });

  it('con muchos puntos solo etiqueta algunos del eje', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => ({ etiqueta: `d${i}`, valor: i + 1 }));
    const { el } = montar(GraficoSerieComponent, { puntos: muchos, tipo: 'linea', titulo: 'Muchos' });
    expect(el.querySelectorAll('.eje-x').length).toBeLessThanOrEqual(10);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(30);
  });

  it('sin datos o todo en cero muestra el mensaje vacío y ninguna imagen', () => {
    const { el } = montar(GraficoSerieComponent, { puntos: [{ etiqueta: 'a', valor: 0 }], vacio: 'Sin datos aún' });
    expect(el.querySelector('svg')).toBeNull();
    expect(el.textContent).toContain('Sin datos aún');
  });
});

