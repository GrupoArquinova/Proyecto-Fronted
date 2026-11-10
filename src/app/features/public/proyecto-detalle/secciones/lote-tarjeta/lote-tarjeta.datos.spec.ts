import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Lote } from '../../../../../core/models/lote.models';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { LoteTarjetaComponent } from './lote-tarjeta.component';

function crear(lote: Partial<Lote>) {
  const servicio = { listarPublicadosPorEntidad: vi.fn(() => of([])) };
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideI18nPruebas(), { provide: MultimediaService, useValue: servicio }] });
  const fixture = TestBed.createComponent(LoteTarjetaComponent);
  fixture.componentRef.setInput('lote', { id: 7, codigo: 'LT-101', areaM2: 1200, activo: true, estadoId: 1, ...lote } as Lote);
  fixture.componentRef.setInput('proyectoId', 6);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, servicio, fixture };
}

describe('LoteTarjetaComponent · datos del lote', () => {
  it('muestra código, nombre, área, estado y etapa; el enlace lleva el lote al formulario de contacto', () => {
    const { el } = crear({ nombre: 'Lote Esquinero 101', estadoNombre: 'DISPONIBLE', etapaNombre: 'Etapa 1 - El Roble' });

    expect(el.querySelector('h3')?.textContent).toBe('LT-101');
    expect(el.querySelector('.nombre')?.textContent).toContain('Lote Esquinero 101');
    expect(el.querySelector('dl')?.textContent).toContain('1.200 m²');
    expect(el.querySelector('.estado')?.textContent).toContain('Disponible');
    expect(el.querySelector('dl')?.textContent).toContain('Etapa 1 - El Roble');
    const enlace = el.querySelector<HTMLAnchorElement>('a.boton');
    expect(enlace?.getAttribute('href')).toBe('/proyectos/6/contacto?lote=7');
  });

  it('muestra la descripción, las características y el precio cuando el lote los tiene', () => {
    const { el } = crear({ descripcion: 'Lote plano con vista', caracteristicas: 'Esquinero\nAgua y luz', precio: 85000000 });

    const textos = Array.from(el.querySelectorAll('.texto')).map(p => p.textContent);
    expect(textos).toEqual(['Lote plano con vista', 'Esquinero\nAgua y luz']);
    expect(el.querySelector('dl')?.textContent).toMatch(/Precio/);
  });

  it('un lote vendido no ofrece pedir información', () => {
    const { el } = crear({ estadoNombre: 'VENDIDO' });

    expect(el.querySelector('.estado')?.classList.contains('vendido')).toBe(true);
    expect(el.querySelector('a.boton')).toBeNull();
  });

  it('un estado desconocido muestra su propio nombre', () => {
    const { el } = crear({ estadoNombre: 'En trámite legal' });

    expect(el.querySelector('.estado')?.textContent).toContain('En trámite legal');
    expect(el.querySelector('.estado')?.classList.contains('otro')).toBe(true);
  });

  it('un lote sin id no consulta imágenes 360° y no muestra el botón', () => {
    const { el, servicio } = crear({ id: undefined });

    expect(servicio.listarPublicadosPorEntidad).not.toHaveBeenCalled();
    expect(el.querySelector('.boton-360')).toBeNull();
  });
});
