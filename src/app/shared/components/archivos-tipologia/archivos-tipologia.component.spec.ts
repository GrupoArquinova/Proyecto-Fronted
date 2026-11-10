import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArchivosTipologiaComponent } from './archivos-tipologia.component';
import { SubidaArchivoComponent } from '../subida-archivo/subida-archivo.component';
import { ArchivoSubido } from '../../../core/services/multimedia.service';

describe('ArchivosTipologiaComponent', () => {
  function crear(imagenes: ArchivoSubido[] = [], planos: ArchivoSubido[] = []) {
    TestBed.configureTestingModule({
      imports: [ArchivosTipologiaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ArchivosTipologiaComponent);
    fixture.componentRef.setInput('imagenes', imagenes);
    fixture.componentRef.setInput('planos', planos);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const subidas = () => fixture.debugElement.queryAll(By.directive(SubidaArchivoComponent)).map(d => d.componentInstance as SubidaArchivoComponent);
    return { fixture, componente: fixture.componentInstance, el, refrescar, subidas };
  }

  afterEach(() => vi.restoreAllMocks());

  const render = (n: number): ArchivoSubido => ({ url: `https://cdn.test/render-${n}.jpg`, nombre: `render-${n}.jpg` });
  const plano = (n: number): ArchivoSubido => ({ url: `https://cdn.test/plano-${n}.pdf`, nombre: `plano-${n}.pdf` });

  it('sin archivos no muestra miniaturas y ofrece dos campos de subida múltiple', () => {
    const { el, subidas } = crear();

    expect(el.querySelectorAll('li').length).toBe(0);
    const campos = subidas();
    expect(campos.length).toBe(2);
    expect(campos[0].tipos()).toEqual(['imagen']);
    expect(campos[1].tipos()).toEqual(['imagen', 'pdf']);
    expect(campos.every(c => c.multiple() && c.limpiarAlSubir())).toBe(true);
  });

  it('muestra una miniatura por cada render y por cada plano (el plano con su nombre)', () => {
    const { el } = crear([render(1), render(2)], [plano(1)]);

    const grupos = el.querySelectorAll('.grupo');
    expect(grupos[0].querySelectorAll('li').length).toBe(2);
    expect((grupos[0].querySelector('img') as HTMLImageElement).alt).toBe('render-1.jpg');
    expect(grupos[1].querySelectorAll('li').length).toBe(1);
    expect(grupos[1].querySelector('li span')!.textContent).toBe('plano-1.pdf');
  });

  it('un archivo subido en renders se agrega al final de la lista de imágenes', () => {
    const { subidas, componente, refrescar, el } = crear([render(1)]);

    subidas()[0].subido.emit({ url: 'https://cdn.test/nuevo.jpg', nombre: 'nuevo.jpg' });
    refrescar();

    expect(componente.imagenes().map(i => i.nombre)).toEqual(['render-1.jpg', 'nuevo.jpg']);
    expect(componente.planos()).toEqual([]);
    expect(el.querySelectorAll('.grupo')[0].querySelectorAll('li').length).toBe(2);
  });

  it('un archivo subido en planos se agrega a la lista de planos', () => {
    const { subidas, componente, refrescar, el } = crear();

    subidas()[1].subido.emit({ url: 'https://cdn.test/p.pdf', nombre: 'planta-baja.pdf' });
    refrescar();

    expect(componente.planos().map(p => p.nombre)).toEqual(['planta-baja.pdf']);
    expect(componente.imagenes()).toEqual([]);
    expect(el.querySelectorAll('.grupo')[1].querySelector('li span')!.textContent).toBe('planta-baja.pdf');
  });

  it('quitar un render elimina solo ese y deja los demás', () => {
    const { el, componente, refrescar } = crear([render(1), render(2), render(3)]);

    (el.querySelectorAll('button[aria-label="Quitar imagen"]')[1] as HTMLButtonElement).click();
    refrescar();

    expect(componente.imagenes().map(i => i.nombre)).toEqual(['render-1.jpg', 'render-3.jpg']);
    expect(el.querySelectorAll('.grupo')[0].querySelectorAll('li').length).toBe(2);
  });

  it('quitar un plano elimina solo ese y no toca los renders', () => {
    const { el, componente, refrescar } = crear([render(1)], [plano(1), plano(2)]);

    (el.querySelector('button[aria-label="Quitar plano"]') as HTMLButtonElement).click();
    refrescar();

    expect(componente.planos().map(p => p.nombre)).toEqual(['plano-2.pdf']);
    expect(componente.imagenes().length).toBe(1);
  });
});
