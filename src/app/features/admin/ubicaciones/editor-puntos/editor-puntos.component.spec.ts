import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/multimedia/proyecto/7')).flush(multimediaDelProyecto);
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/zonas-comunes/proyecto/7')).flush(zonasDelProyecto);
    http.expectOne(r => r.url.endsWith('/etapas/proyecto/7')).flush([{ id: 5, nombre: 'Etapa B' }]);
  }

  let panoramasExistentes: object[] = [];
  let multimediaDelProyecto: object[] = [];
  let zonasDelProyecto: object[] = [];

  beforeEach(() => {
    panoramasExistentes = [];
    multimediaDelProyecto = [];
    zonasDelProyecto = [{ id: 3, proyectoId: 7, nombre: 'Piscina', descripcion: '', publicado: true, activo: true }];
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
      proyectoId: 7, escena: 'AEREA', etiqueta: 'C10', loteId: 2, etapaId: null, zonaComunId: null, yaw: 1.5, pitch: -0.2
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
      proyectoId: 7, escena: 'URBANISMO', etiqueta: 'Etapa B', loteId: null, etapaId: 5, zonaComunId: null, posX: 42.5, posY: 10
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
      proyectoId: 7, escena: 'ENTORNO', etiqueta: 'Jericó · 12 min', loteId: null, etapaId: null, zonaComunId: null, yaw: 0.7, pitch: -0.1
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

  describe('pestana Mapa (imagenes)', () => {
    const mapa = (id: number, orden: number, extra: object = {}) =>
      ({ id, proyectoId: 7, tipo: 'MAPA', url: `https://x.com/${id}.jpg`, titulo: `Mapa ${id}`, orden, portada: false, publicado: true, activo: true, ...extra });
    const entrada = (...nombres: string[]) =>
      ({ target: { files: nombres.map(n => new File(['x'], n, { type: 'image/jpeg' })), value: 'x' } }) as unknown as Event;

    it('lista solo las imagenes MAPA activas del proyecto, en el orden del administrador', async () => {
      multimediaDelProyecto = [
        mapa(3, 2), mapa(2, 1), mapa(9, 1, { activo: false }), { id: 5, tipo: 'IMAGEN', url: 'https://x.com/i.jpg', activo: true, orden: 1 }
      ];
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      editor.elegirMapa();
      expect(editor.mapaActivo()).toBe(true);
      expect(editor.imagenesMapa().map(m => m.id)).toEqual([2, 3]);

      editor.elegirEscena('ENTORNO');
      expect(editor.mapaActivo()).toBe(false);
    });

    it('la pestana Mapa existe aunque el proyecto no tenga ninguna imagen 360', async () => {
      const editor = crear({ ...ubicacion, recorrido360Url: '', vistaAereaUrl: '', urbanismoUrl: '' });
      await Promise.resolve();
      responderCargas();

      editor.elegirMapa();
      expect(editor.escenas()).toEqual([]);
      expect(editor.mapaActivo()).toBe(true);
    });

    it('subir varias imagenes crea un multimedia MAPA por cada una, con el orden siguiente', async () => {
      multimediaDelProyecto = [mapa(2, 4)];
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      const subida = editor.subirMapa(entrada('a.jpg', 'b.jpg'));

      for (const [id, orden] of [[20, 5], [21, 6]]) {
        await vi.waitFor(() => http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia')).flush(
          { ...mapa(id, orden) }));
      }
      await subida;

      expect(editor.imagenesMapa().map(m => [m.id, m.orden])).toEqual([[2, 4], [20, 5], [21, 6]]);
      expect(editor.subiendoMapa()).toBe(false);
    });

    it('subir un archivo que no es imagen no sube nada', async () => {
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      const pdf = { target: { files: [new File(['x'], 'plano.pdf', { type: 'application/pdf' })], value: 'x' } } as unknown as Event;
      await editor.subirMapa(pdf);

      http.expectNone(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
      expect(editor.imagenesMapa()).toEqual([]);
    });

    it('mover una imagen intercambia su lugar y guarda el orden nuevo', async () => {
      multimediaDelProyecto = [mapa(2, 1), mapa(3, 2)];
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      const movimiento = editor.moverMapa(editor.imagenesMapa()[1], -1);
      expect(editor.imagenesMapa().map(m => m.id)).toEqual([3, 2]);

      for (const id of [3, 2]) {
        await vi.waitFor(() => http.expectOne(r => r.method === 'PUT' && r.url.endsWith(`/multimedia/${id}`)).flush({}));
      }
      await movimiento;
      expect(editor.imagenesMapa().map(m => m.orden)).toEqual([1, 2]);
    });
  });

  describe('pestana Zonas destacadas', () => {
    const imagenFondo = { id: 60, proyectoId: 7, tipo: 'ZONAS_DESTACADAS', url: 'https://x.com/fondo.jpg', activo: true, portada: false, publicado: true };

    it('existe aunque no haya imagen: primero hay que subir la de fondo', async () => {
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      editor.elegirZonas();
      expect(editor.esZonas()).toBe(true);
      expect(editor.escena()).toBe('ZONAS');
      expect(editor.escenaActual()).toBeNull();
    });

    it('con una imagen de fondo ya subida se pueden colocar botones sobre ella', async () => {
      multimediaDelProyecto = [imagenFondo];
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      editor.elegirZonas();
      expect(editor.escenaActual()?.url).toBe('https://x.com/fondo.jpg');
      expect(editor.esPlano()).toBe(true);
    });

    it('un boton de zona guarda la zona y su posicion en porcentaje, con el nombre de la zona como texto', async () => {
      multimediaDelProyecto = [imagenFondo];
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      editor.elegirZonas();
      editor.clicEnPlano({ x: 40.5, y: 22 });
      expect(editor.puedeGuardar()).toBe(false);
      editor.elegirZona(3);
      expect(editor.etiqueta()).toBe('Piscina');
      expect(editor.puedeGuardar()).toBe(true);

      editor.guardar();
      const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
      expect(peticion.request.body).toEqual({
        proyectoId: 7, escena: 'ZONAS', etiqueta: 'Piscina', loteId: null, etapaId: null, zonaComunId: 3, posX: 40.5, posY: 22
      });
      peticion.flush({ id: 70, proyectoId: 7, escena: 'ZONAS', etiqueta: 'Piscina', zonaComunId: 3, zonaComunNombre: 'Piscina', posX: 40.5, posY: 22 });

      // La zona ya tiene botón: no se vuelve a ofrecer
      expect(editor.zonasLibres()).toEqual([]);
      expect(editor.puntosDeEscena().map(p => p.id)).toEqual([70]);
    });

    it('subir la imagen de fondo la guarda como multimedia ZONAS_DESTACADAS del proyecto', async () => {
      const editor = crear();
      await Promise.resolve();
      responderCargas();
      editor.elegirZonas();

      const subida = editor.subirImagenZonas({
        target: { files: [new File(['x'], 'fondo.jpg', { type: 'image/jpeg' })], value: 'x' }
      } as unknown as Event);

      await vi.waitFor(() => {
        const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
        expect(peticion.request.body).toMatchObject({ proyectoId: 7, tipo: 'ZONAS_DESTACADAS', publicado: true, activo: true });
        peticion.flush({ ...imagenFondo, url: 'https://res.cloudinary.com/x/image/upload/v1/lote.jpg' });
      });
      await subida;

      expect(editor.imagenZonas()?.id).toBe(60);
      expect(editor.escenaActual()).not.toBeNull();
    });

    it('subir el 360 de una zona crea un multimedia PANORAMICA_360 de esa zona y reemplaza el anterior', async () => {
      panoramasExistentes = [{ id: 41, zonaComunId: 3, tipo: 'PANORAMICA_360', url: 'https://x.com/vieja.jpg', activo: true }];
      const editor = crear();
      await Promise.resolve();
      responderCargas();

      const subida = editor.subirZona360(
        { id: 70, proyectoId: 7, escena: 'ZONAS', etiqueta: 'Piscina', zonaComunId: 3, zonaComunNombre: 'Piscina' },
        { target: { files: [new File(['x'], 'piscina.jpg', { type: 'image/jpeg' })], value: 'x' } } as unknown as Event);

      await vi.waitFor(() => {
        const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
        expect(peticion.request.body).toMatchObject({ zonaComunId: 3, tipo: 'PANORAMICA_360', publicado: true });
        peticion.flush({ id: 80, zonaComunId: 3, tipo: 'PANORAMICA_360', url: 'https://x.com/nueva.jpg', activo: true });
      });
      await subida;
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/41')).flush(null);

      expect(editor.panoramasZona().get(3)?.id).toBe(80);
      expect(editor.subiendoZona()).toBeNull();
    });
  });
});
