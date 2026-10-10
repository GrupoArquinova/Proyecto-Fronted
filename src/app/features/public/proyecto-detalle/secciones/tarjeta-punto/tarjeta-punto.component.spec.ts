import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { TarjetaPuntoComponent } from './tarjeta-punto.component';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';

const etapa: Punto360 = { proyectoId: 6, escena: 'URBANISMO', etiqueta: 'E.A - Guayacán', etapaId: 3, etapaNombre: 'Etapa A - Guayacán', posX: 40, posY: 50 };

function crear(listar: (tipo: string, id: number) => unknown, punto: Punto360 = etapa) {
  const servicio = { listarPublicadosPorEntidad: vi.fn(listar as never) };
  TestBed.configureTestingModule({ providers: [provideI18nPruebas(), { provide: MultimediaService, useValue: servicio }] });
  const fixture = TestBed.createComponent(TarjetaPuntoComponent);
  fixture.componentRef.setInput('punto', punto);
  fixture.detectChanges();
  return { fixture, servicio, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
}

describe('TarjetaPuntoComponent (etapa)', () => {
  it('pide las imágenes publicadas de la etapa y las muestra en un carrusel', () => {
    const { fixture, servicio } = crear(() => of([
      { id: 1, tipo: 'IMAGEN', url: 'https://img.test/a.png', titulo: 'Render' },
      { id: 2, tipo: 'PLANO', url: 'https://img.test/b.png' },
      { id: 3, tipo: 'VIDEO', url: 'https://img.test/c.mp4' }
    ]));
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledWith('etapa', 3);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-carrusel-laminas')).not.toBeNull();
    expect(el.textContent).not.toContain('aún no tiene imágenes');
  });

  it('sin imágenes avisa que la etapa todavía no tiene', () => {
    const { texto, fixture } = crear(() => of([]));
    expect(texto()).toContain('Esta etapa aún no tiene imágenes.');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-carrusel-laminas')).toBeNull();
  });

  it('si falla la consulta se comporta como una etapa sin imágenes', () => {
    const { texto } = crear(() => throwError(() => new Error('sin red')));
    expect(texto()).toContain('Esta etapa aún no tiene imágenes.');
  });

  it('si la etapa tiene imagen 360° la abre en el visor, aparte de las imágenes', () => {
    const { fixture } = crear(() => of([
      { id: 1, tipo: 'IMAGEN', url: 'https://img.test/a.png' },
      { id: 2, tipo: 'PANORAMICA_360', url: 'https://img.test/360.jpg' }
    ]));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-visor-360')).not.toBeNull();
    expect(el.querySelector('app-carrusel-laminas')).not.toBeNull();
  });

  it('con solo imagen 360° no avisa que falten imágenes', () => {
    const { fixture, texto } = crear(() => of([{ id: 2, tipo: 'PANORAMICA_360', url: 'https://img.test/360.jpg' }]));
    expect((fixture.nativeElement as HTMLElement).querySelector('app-visor-360')).not.toBeNull();
    expect(texto()).not.toContain('aún no tiene imágenes');
  });

  it('un lote no consulta imágenes de etapa', () => {
    const lote: Punto360 = { ...etapa, loteId: 9, loteCodigo: 'LT-1', etapaId: 3 };
    const { servicio } = crear(() => of([]), lote);
    expect(servicio.listarPublicadosPorEntidad).not.toHaveBeenCalledWith('etapa', expect.anything());
  });
});
