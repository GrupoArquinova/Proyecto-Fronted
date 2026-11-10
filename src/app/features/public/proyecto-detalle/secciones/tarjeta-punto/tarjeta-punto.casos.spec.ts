import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { IdiomaService } from '../../../../../core/services/idioma.service';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { TarjetaPuntoComponent } from './tarjeta-punto.component';

// El visor real necesita WebGL: aquí se reemplaza por uno vacío
vi.mock('@photo-sphere-viewer/core', () => ({
  Viewer: class {
    destroy() { /* sin efecto */ }
    animate() { return null; }
    addEventListener() { /* sin efecto */ }
    getPlugin() { return { setMarkers() { /* sin efecto */ }, addEventListener() { /* sin efecto */ } }; }
  }
}));
vi.mock('@photo-sphere-viewer/markers-plugin', () => ({ MarkersPlugin: class {} }));

const zona: Punto360 = { id: 1, proyectoId: 7, escena: 'ZONAS', etiqueta: 'Jacuzzi', zonaComunId: 12, posX: 10, posY: 20 };
const lote: Punto360 = { id: 2, proyectoId: 7, escena: 'AEREA', etiqueta: 'Lote 5', loteId: 5, loteCodigo: 'L5', loteAreaM2: 1100, loteEstado: 'DISPONIBLE', etapaId: 3 };
const etapa: Punto360 = { id: 3, proyectoId: 7, escena: 'URBANISMO', etiqueta: 'Etapa 3', etapaId: 3, etapaNombre: 'Etapa 3 - Guayacán' };
const lugar: Punto360 = { id: 4, proyectoId: 7, escena: 'ENTORNO', etiqueta: 'Colegio' };

const PANO = { id: 9, tipo: 'PANORAMICA_360', url: 'https://img.test/360.jpg' };

function crear(listar: (tipo: string, id: number) => Observable<unknown>, punto: Punto360, extra: Record<string, unknown> = {}) {
  const servicio = { listarPublicadosPorEntidad: vi.fn(listar as never) };
  TestBed.configureTestingModule({ providers: [provideI18nPruebas(), { provide: MultimediaService, useValue: servicio }] });
  const fixture = TestBed.createComponent(TarjetaPuntoComponent);
  fixture.componentRef.setInput('punto', punto);
  for (const [k, v] of Object.entries(extra)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, servicio, el, c: fixture.componentInstance, texto: () => el.textContent ?? '' };
}

const refrescar = (fixture: { componentRef: { injector: { get: (t: typeof ChangeDetectorRef) => ChangeDetectorRef } }; detectChanges: () => void }) => {
  fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
  fixture.detectChanges();
};

describe('TarjetaPuntoComponent (zona común / amenidad)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('muestra el tipo "Amenidad", el nombre y la descripción de la zona', () => {
    const { el } = crear(() => of([]), zona, { descripcion: 'Agua caliente todo el año' });
    expect(el.querySelector('.tipo')?.textContent).toBe('Amenidad');
    expect(el.querySelector('h3')?.textContent).toBe('Jacuzzi');
    expect(el.querySelector('.descripcion')?.textContent).toBe('Agua caliente todo el año');
    expect(el.querySelector('aside')?.getAttribute('aria-label')).toBe('Jacuzzi');
    expect(el.querySelector('aside')?.getAttribute('role')).toBe('dialog');
  });

  it('sin descripción no muestra el párrafo', () => {
    const { el } = crear(() => of([]), zona, { descripcion: null });
    expect(el.querySelector('.descripcion')).toBeNull();
  });

  it('pide a Multimedia la imagen 360° de la zona', () => {
    const { servicio } = crear(() => of([]), zona);
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledTimes(1);
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledWith('zonaComun', 12);
  });

  it('con 360° abre el visor con su título y agranda la tarjeta', () => {
    const { el, c } = crear(() => of([{ id: 1, tipo: 'IMAGEN', url: 'https://img.test/a.jpg' }, PANO]), zona);
    expect(c.panorama()).toBe('https://img.test/360.jpg');
    expect(el.querySelector('app-visor-360')).not.toBeNull();
    expect(el.querySelector('.visor-360')?.getAttribute('aria-label')).toBe('Recorrido 360: zona Jacuzzi');
    expect(el.querySelector('aside')?.classList.contains('ancha')).toBe(true);
    expect(el.querySelector('.vacio')).toBeNull();
  });

  it('sin 360° pero con foto muestra la foto y el aviso', () => {
    const { el } = crear(() => of([]), zona, { foto: 'https://img.test/jacuzzi.jpg' });
    expect(el.querySelector('app-visor-360')).toBeNull();
    const foto = el.querySelector<HTMLImageElement>('img.foto')!;
    expect(foto.getAttribute('src')).toBe('https://img.test/jacuzzi.jpg');
    expect(foto.alt).toBe('Jacuzzi');
    expect(el.querySelector('.vacio')?.textContent).toBe('Esta zona aún no tiene imagen 360°.');
    expect(el.querySelector('aside')?.classList.contains('ancha')).toBe(false);
  });

  it('sin 360° ni foto solo muestra el aviso', () => {
    const { el } = crear(() => of([]), zona);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.vacio')?.textContent).toBe('Esta zona aún no tiene imagen 360°.');
  });

  it('si la consulta falla se comporta como una zona sin 360°', () => {
    const { el } = crear(() => throwError(() => new Error('sin red')), zona);
    expect(el.querySelector('.vacio')?.textContent).toBe('Esta zona aún no tiene imagen 360°.');
  });

  it('mientras consulta dice que está buscando y luego muestra el resultado', () => {
    const respuesta = new Subject<unknown>();
    const { fixture, el, c } = crear(() => respuesta, zona);
    expect(c.panorama()).toBeUndefined();
    expect(el.querySelector('.vacio')?.textContent).toBe('Buscando imagen 360°...');

    respuesta.next([PANO]);
    respuesta.complete();
    refrescar(fixture);

    expect(el.querySelector('app-visor-360')).not.toBeNull();
    expect(el.querySelector('.vacio')).toBeNull();
  });

  it('la zona tiene prioridad sobre el lote si el punto trae ambos', () => {
    const { servicio, el } = crear(() => of([]), { ...zona, loteId: 5 });
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledWith('zonaComun', 12);
    expect(el.querySelector('.tipo')?.textContent).toBe('Amenidad');
  });
});

describe('TarjetaPuntoComponent (lote)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('muestra el tipo "Lote", su etiqueta, el área formateada y el estado', () => {
    const { el } = crear(() => of([]), lote);
    expect(el.querySelector('.tipo')?.textContent).toBe('Lote');
    expect(el.querySelector('h3')?.textContent).toBe('Lote 5');
    const datos = Array.from(el.querySelectorAll('.datos li')).map(li => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(datos).toEqual(['Área: 1.100 m²', 'Estado: DISPONIBLE']);
  });

  it('el área sigue el idioma elegido', async () => {
    const { el, fixture } = crear(() => of([]), lote);
    const idioma = TestBed.inject(IdiomaService);
    idioma.cambiar('en', false);
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'), { timeout: 5000 });
    refrescar(fixture);
    expect(el.querySelector('.datos li')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Área: 1,100 m²');
  });

  it('sin área ni estado no muestra los datos', () => {
    const { el } = crear(() => of([]), { ...lote, loteAreaM2: null, loteEstado: null });
    expect(el.querySelectorAll('.datos li').length).toBe(0);
  });

  it('solo el área o solo el estado muestran únicamente ese dato', () => {
    const soloEstado = crear(() => of([]), { ...lote, loteAreaM2: null });
    expect(Array.from(soloEstado.el.querySelectorAll('.datos li')).map(li => li.textContent?.trim())).toEqual(['Estado: DISPONIBLE']);
    TestBed.resetTestingModule();
    const soloArea = crear(() => of([]), { ...lote, loteEstado: null });
    expect(Array.from(soloArea.el.querySelectorAll('.datos li')).map(li => li.textContent?.trim())).toEqual(['Área: 1.100 m²']);
  });

  it('pide el 360° del lote, no de la etapa', () => {
    const { servicio } = crear(() => of([]), lote);
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledTimes(1);
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenCalledWith('lote', 5);
  });

  it('con 360° abre el visor con el título del lote', () => {
    const { el } = crear(() => of([PANO]), lote);
    expect(el.querySelector('.visor-360')?.getAttribute('aria-label')).toBe('Recorrido 360: lote Lote 5');
    expect(el.querySelector('aside')?.classList.contains('ancha')).toBe(true);
  });

  it('sin 360° avisa que el lote todavía no tiene imagen', () => {
    const { el } = crear(() => of([{ id: 1, tipo: 'IMAGEN', url: 'https://img.test/a.jpg' }]), lote);
    expect(el.querySelector('app-visor-360')).toBeNull();
    expect(el.querySelector('.vacio')?.textContent).toBe('Este lote aún no tiene imagen 360°.');
  });

  it('si la consulta falla avisa igual que un lote sin 360°', () => {
    const { el } = crear(() => throwError(() => new Error('x')), lote);
    expect(el.querySelector('.vacio')?.textContent).toBe('Este lote aún no tiene imagen 360°.');
  });

  it('mientras consulta dice que está buscando', () => {
    const { el } = crear(() => new Subject<unknown>(), lote);
    expect(el.querySelector('.vacio')?.textContent).toBe('Buscando imagen 360°...');
  });

  it('cambiar el punto de lote vuelve a consultar el 360° del nuevo lote', () => {
    const { fixture, servicio, c } = crear(() => of([]), lote);
    fixture.componentRef.setInput('punto', { ...lote, loteId: 6, etiqueta: 'Lote 6' });
    fixture.detectChanges();
    expect(servicio.listarPublicadosPorEntidad).toHaveBeenLastCalledWith('lote', 6);
    expect(c.esLote()).toBe(true);
  });
});

describe('TarjetaPuntoComponent (etapa y lugares)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('una etapa muestra su nombre, el tipo "Etapa" y las imágenes en un carrusel con su etiqueta', () => {
    const { el, c } = crear(() => of([{ id: 1, tipo: 'IMAGEN', url: 'https://img.test/a.jpg', titulo: 'Render' }]), etapa);
    expect(c.esEtapa()).toBe(true);
    expect(el.querySelector('.tipo')?.textContent).toBe('Etapa');
    expect(el.querySelector('.datos li')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Etapa: Etapa 3 - Guayacán');
    expect(el.querySelector('.visor-etapa app-carrusel-laminas section')?.getAttribute('aria-label')).toBe('Imágenes de Etapa 3');
    expect(el.querySelector('aside')?.classList.contains('ancha')).toBe(true);
  });

  it('una etapa sin nombre no muestra el dato "Etapa:"', () => {
    const { el } = crear(() => of([]), { ...etapa, etapaNombre: null });
    expect(el.querySelector('.datos')).toBeNull();
  });

  it('mientras consulta las imágenes de la etapa dice que está buscando', () => {
    const { el, c } = crear(() => new Subject<unknown>(), etapa);
    expect(c.imagenesEtapa()).toBeUndefined();
    expect(c.panoramaEtapa()).toBeUndefined();
    expect(el.querySelector('.vacio')?.textContent).toBe('Buscando imágenes...');
  });

  it('una etapa con solo imágenes no muestra el visor 360° ni el aviso', () => {
    const { el, c } = crear(() => of([{ id: 1, tipo: 'PLANO', url: 'https://img.test/p.jpg' }]), etapa);
    expect(c.panoramaEtapa()).toBeNull();
    expect(el.querySelector('app-visor-360')).toBeNull();
    expect(el.querySelector('.vacio')).toBeNull();
  });

  it('una etapa con 360° y sin imágenes muestra el visor y no avisa que falten imágenes', () => {
    const { el, c } = crear(() => of([PANO]), etapa);
    expect(c.imagenesEtapa()).toEqual([]);
    expect(el.querySelector('.visor-360')?.getAttribute('aria-label')).toBe('Recorrido 360: etapa Etapa 3');
    expect(el.querySelector('.vacio')).toBeNull();
    expect(el.querySelector('aside')?.classList.contains('ancha')).toBe(true);
  });

  it('una etapa sin recursos avisa y no queda ancha', () => {
    const { el } = crear(() => of([]), etapa);
    expect(el.querySelector('.vacio')?.textContent).toBe('Esta etapa aún no tiene imágenes.');
    expect(el.querySelector('aside')?.classList.contains('ancha')).toBe(false);
  });

  it('un lugar cercano (sin etapa, lote ni zona) no consulta nada y se trata como etapa vacía', () => {
    const { servicio, el, c } = crear(() => of([]), lugar);
    expect(servicio.listarPublicadosPorEntidad).not.toHaveBeenCalled();
    expect(c.esEtapa()).toBe(true);
    expect(c.panorama()).toBeNull();
    expect(el.querySelector('.vacio')?.textContent).toBe('Esta etapa aún no tiene imágenes.');
  });
});

describe('TarjetaPuntoComponent (cierre)', () => {
  it('el botón × emite cerrar y tiene etiqueta accesible', () => {
    const { el, c } = crear(() => of([]), zona);
    const cerrados: void[] = [];
    c.cerrar.subscribe(() => cerrados.push(undefined));
    const boton = el.querySelector<HTMLButtonElement>('.cerrar')!;
    expect(boton.getAttribute('aria-label')).toBe('Cerrar');
    boton.click();
    expect(cerrados.length).toBe(1);
  });
});
