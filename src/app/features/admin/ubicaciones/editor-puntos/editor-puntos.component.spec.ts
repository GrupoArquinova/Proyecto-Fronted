import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { EditorPuntosComponent } from './editor-puntos.component';
import { Ubicacion } from '../../../../core/models/ubicacion.models';

const ubicacion: Ubicacion = {
  proyectoId: 7,
  proyectoNombre: 'La Hacienda',
  ciudad: 'Tunja',
  departamento: 'Boyacá',
  recorrido360Url: 'https://res.cloudinary.com/x/image/upload/v1/entorno.jpg',
  vistaAereaUrl: 'https://res.cloudinary.com/x/video/upload/v1/aerea.mp4',
  urbanismoUrl: 'https://res.cloudinary.com/x/image/upload/v1/plano.png'
};

describe('EditorPuntosComponent', () => {
  let http: HttpTestingController;

  function crear(u: Ubicacion = ubicacion) {
    const fixture = TestBed.createComponent(EditorPuntosComponent);
    fixture.componentRef.setInput('ubicacion', u);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function responderCargas() {
    http.expectOne(r => r.url.endsWith('/puntos-360/proyecto/7')).flush([]);
    http.expectOne(r => r.url.endsWith('/lotes')).flush([
      { id: 1, codigo: 'C2', areaM2: 800, activo: true, proyectoId: 7, estadoId: 1 },
      { id: 2, codigo: 'C10', areaM2: 900, activo: true, proyectoId: 7, estadoId: 1 },
      { id: 3, codigo: 'X1', areaM2: 500, activo: true, proyectoId: 99, estadoId: 1 }
    ]);
    http.expectOne(r => r.url.endsWith('/multimedia')).flush(panoramasExistentes);
    http.expectOne(r => r.url.endsWith('/etapas/proyecto/7')).flush([{ id: 5, nombre: 'Etapa B' }]);
  }

  let panoramasExistentes: object[] = [];

  beforeEach(() => {
    panoramasExistentes = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CloudinaryService, useValue: { subirArchivo: () => of({ url: 'https://res.cloudinary.com/x/image/upload/v1/lote.jpg' }) } }
      ]
    });
    // Sin plantilla: lo que se prueba es la logica del editor, no el visor 360 (que necesita un navegador real)
    TestBed.overrideComponent(EditorPuntosComponent, { set: { template: '', imports: [], styleUrl: undefined, styles: [] } });
    http = TestBed.inject(HttpTestingController);
  });

  it('solo ofrece las imagenes que son imagen: un video no sirve para colocar botones', async () => {
    const editor = crear();
    await Promise.resolve();
    responderCargas();

    expect(editor.escenas().map(e => e.id)).toEqual(['ENTORNO', 'URBANISMO']);
    expect(editor.escena()).toBe('ENTORNO');
  });

  it('ofrece solo los lotes del proyecto, en orden natural', async () => {
    const editor = crear();
    await Promise.resolve();
    responderCargas();

    expect(editor.lotesLibres().map(l => l.codigo)).toEqual(['C2', 'C10']);
  });

  it('guarda un boton de imagen 360 con sus angulos y rellena la etiqueta con el codigo del lote', async () => {
    const editor = crear({ ...ubicacion, vistaAereaUrl: 'https://res.cloudinary.com/x/image/upload/v1/aerea.jpg' });
    await Promise.resolve();
    responderCargas();
    editor.elegirEscena('AEREA');

    expect(editor.puedeGuardar()).toBe(false);
    editor.clicEn360({ yaw: 1.5, pitch: -0.2 });
    editor.elegirLote(2);
    expect(editor.etiqueta()).toBe('C10');
    expect(editor.puedeGuardar()).toBe(true);

    editor.guardar();
    const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
    expect(peticion.request.body).toEqual({
      proyectoId: 7, escena: 'AEREA', etiqueta: 'C10', loteId: 2, etapaId: null, yaw: 1.5, pitch: -0.2
    });
    peticion.flush({ id: 9, proyectoId: 7, escena: 'AEREA', etiqueta: 'C10', loteId: 2, yaw: 1.5, pitch: -0.2 });

    expect(editor.puntosDeEscena().map(p => p.id)).toEqual([9]);
    // El lote ya usado deja de ofrecerse y el formulario queda limpio
    expect(editor.lotesLibres().map(l => l.codigo)).toEqual(['C2']);
    expect(editor.hayPendiente()).toBe(false);
  });

  it('en el plano guarda la etapa y la posicion en porcentaje', async () => {
    const editor = crear();
    await Promise.resolve();
    responderCargas();

    editor.elegirEscena('URBANISMO');
    editor.clicEnPlano({ x: 42.5, y: 10 });
    editor.elegirEtapa(5);
    editor.guardar();

    const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
    expect(peticion.request.body).toEqual({
      proyectoId: 7, escena: 'URBANISMO', etiqueta: 'Etapa B', loteId: null, etapaId: 5, posX: 42.5, posY: 10
    });
    peticion.flush({ id: 10, proyectoId: 7, escena: 'URBANISMO', etiqueta: 'Etapa B', etapaId: 5, posX: 42.5, posY: 10 });
  });

  it('un lugar cercano se guarda sin lote ni etapa: solo el rotulo y su posicion', async () => {
    const editor = crear();
    await Promise.resolve();
    responderCargas();

    editor.clicEn360({ yaw: 0.7, pitch: -0.1 });
    expect(editor.puedeGuardar()).toBe(false);
    editor.etiqueta.set('Jericó · 12 min');
    expect(editor.puedeGuardar()).toBe(true);

    editor.guardar();
    const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
    expect(peticion.request.body).toEqual({
      proyectoId: 7, escena: 'ENTORNO', etiqueta: 'Jericó · 12 min', loteId: null, etapaId: null, yaw: 0.7, pitch: -0.1
    });
    peticion.flush({ id: 11, proyectoId: 7, escena: 'ENTORNO', etiqueta: 'Jericó · 12 min', yaw: 0.7, pitch: -0.1 });

    expect(editor.lotesLibres().length).toBe(2);
  });

  it('sabe a que lotes ya se les subio su imagen 360', async () => {
    panoramasExistentes = [
      { id: 40, loteId: 2, tipo: 'PANORAMICA_360', url: 'https://x.com/a.jpg', activo: true },
      { id: 41, loteId: 1, tipo: 'IMAGEN', url: 'https://x.com/b.jpg', activo: true }
    ];
    const editor = crear();
    await Promise.resolve();
    responderCargas();

    expect(editor.tienePanorama({ proyectoId: 7, escena: 'ENTORNO', etiqueta: 'C10', loteId: 2 })).toBe(true);
    expect(editor.tienePanorama({ proyectoId: 7, escena: 'ENTORNO', etiqueta: 'C2', loteId: 1 })).toBe(false);
  });

  it('subir la 360 de un lote la guarda en su multimedia y reemplaza la anterior', async () => {
    panoramasExistentes = [{ id: 40, loteId: 2, tipo: 'PANORAMICA_360', url: 'https://x.com/vieja.jpg', activo: true }];
    const editor = crear();
    await Promise.resolve();
    responderCargas();

    const archivo = new File(['x'], 'lote.jpg', { type: 'image/jpeg' });
    const entrada = { files: [archivo], value: 'x' } as unknown as HTMLInputElement;
    editor.subir360({ id: 9, proyectoId: 7, escena: 'ENTORNO', etiqueta: 'C10', loteId: 2, loteCodigo: 'C10' }, { target: entrada } as unknown as Event);

    const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
    expect(peticion.request.body).toMatchObject({
      loteId: 2, tipo: 'PANORAMICA_360', url: 'https://res.cloudinary.com/x/image/upload/v1/lote.jpg', publicado: true, activo: true
    });
    peticion.flush({ id: 50, loteId: 2, tipo: 'PANORAMICA_360', url: 'https://res.cloudinary.com/x/image/upload/v1/lote.jpg', activo: true });

    // La imagen anterior se quita para que el lote tenga una sola
    http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/40')).flush(null);
    expect(editor.panoramas().get(2)?.id).toBe(50);
    expect(editor.subiendoLote()).toBeNull();
  });

  it('sin una imagen cargada no hay donde colocar botones', async () => {
    const editor = crear({ ...ubicacion, recorrido360Url: '', vistaAereaUrl: '', urbanismoUrl: '' });
    await Promise.resolve();
    responderCargas();

    expect(editor.escenas()).toEqual([]);
    expect(editor.escena()).toBeNull();
  });
});
