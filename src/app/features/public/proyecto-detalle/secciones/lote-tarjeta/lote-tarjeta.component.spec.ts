import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { Lote } from '../../../../../core/models/lote.models';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { LoteTarjetaComponent } from './lote-tarjeta.component';

const lote = (id: number, codigo: string) => ({ id, codigo, areaM2: 1200, estadoNombre: 'DISPONIBLE', etapaNombre: 'Etapa 1' }) as unknown as Lote;

function crear(listar: (tipo: string, id: number) => unknown) {
  const servicio = { listarPublicadosPorEntidad: vi.fn(listar as never) };
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideI18nPruebas(), { provide: MultimediaService, useValue: servicio }] });
  const fixture = TestBed.createComponent(LoteTarjetaComponent);
  fixture.componentRef.setInput('lote', lote(7, 'LT-101'));
  fixture.componentRef.setInput('proyectoId', 6);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture, servicio, el,
    boton360: () => el.querySelector<HTMLButtonElement>('.boton-360'),
    dialogo: () => el.querySelector('.dialogo-360'),
  };
}

const con360 = () => of([
  { id: 1, tipo: 'IMAGEN', url: 'https://img.test/foto.jpg' },
  { id: 2, tipo: 'PANORAMICA_360', url: 'https://img.test/360.jpg' },
]);

describe('LoteTarjetaComponent · imagen 360°', () => {
  it('si el lote tiene imagen 360° muestra el botón "Ver en 360°"', () => {
    const { boton360, servicio } = crear(con360);

    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledWith('lote', 7);
    expect(boton360()).not.toBeNull();
    expect(boton360()?.textContent).toContain('Ver en 360°');
  });

  it('si el lote no tiene imagen 360° no muestra el botón (ni cuando la consulta falla)', () => {
    expect(crear(() => of([{ id: 1, tipo: 'IMAGEN', url: 'https://img.test/foto.jpg' }])).boton360()).toBeNull();
    TestBed.resetTestingModule();
    expect(crear(() => throwError(() => new Error('sin red'))).boton360()).toBeNull();
  });

  it('el botón abre la ventana (un <dialog> modal) con el visor 360° y se cierra con la X o al tocar el fondo', () => {
    const { fixture, el, boton360, dialogo } = crear(con360);
    expect(dialogo()).toBeNull();

    boton360()?.click();
    fixture.detectChanges();
    expect(dialogo()?.tagName).toBe('DIALOG');
    expect(dialogo()?.hasAttribute('open')).toBe(true);
    expect(el.querySelector('.dialogo-360 app-visor-360')).not.toBeNull();
    expect(dialogo()?.textContent).toContain('LT-101');

    el.querySelector<HTMLButtonElement>('.cerrar-360')?.click();
    fixture.detectChanges();
    expect(dialogo()).toBeNull();

    boton360()?.click();
    fixture.detectChanges();
    el.querySelector<HTMLElement>('.dialogo-360 header')?.click(); // tocar dentro de la ventana no la cierra
    fixture.detectChanges();
    expect(dialogo()).not.toBeNull();
    (dialogo() as HTMLElement).click(); // tocar el fondo (el propio dialog) sí
    fixture.detectChanges();
    expect(dialogo()).toBeNull();
  });

  it('Escape (el cierre nativo del dialog) también cierra la ventana', () => {
    const { fixture, boton360, dialogo } = crear(con360);
    boton360()?.click();
    fixture.detectChanges();

    dialogo()?.dispatchEvent(new Event('close'));
    fixture.detectChanges();

    expect(dialogo()).toBeNull();
  });

  it('al elegir otro lote la ventana se cierra y se consulta el 360° del nuevo', () => {
    const { fixture, boton360, dialogo, servicio } = crear(con360);
    boton360()?.click();
    fixture.detectChanges();
    expect(dialogo()).not.toBeNull();

    fixture.componentRef.setInput('lote', lote(8, 'LT-102'));
    fixture.detectChanges();

    expect(dialogo()).toBeNull();
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledWith('lote', 8);
  });

  it('el botón de pedir información sigue ahí junto al de 360°', () => {
    const { el } = crear(con360);

    expect(el.querySelector('a.boton')).not.toBeNull();
    expect(el.querySelector('.boton-360')).not.toBeNull();
  });
});
