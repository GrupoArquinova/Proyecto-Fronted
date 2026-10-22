import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorPuntosComponent } from './editor-puntos.component';
import { Ubicacion } from '../../../../core/models/ubicacion.models';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { provideI18nPruebas } from '../../../../i18n/pruebas';
import { Visor360Component } from '../../../public/proyecto-detalle/secciones/visor-360/visor-360.component';

const ubicacion: Ubicacion = {
  proyectoId: 7,
  proyectoNombre: 'La Hacienda',
  ciudad: 'Tunja',
  departamento: 'Boyacá',
  recorrido360Url: 'https://res.cloudinary.com/x/image/upload/v1/entorno.jpg',
  vistaAereaUrl: 'https://res.cloudinary.com/x/image/upload/v1/aerea.jpg',
  urbanismoUrl: 'https://res.cloudinary.com/x/image/upload/v1/plano.png',
};

const lugar = { id: 1, proyectoId: 7, escena: 'ENTORNO', etiqueta: 'Jericó', yaw: 0.5, pitch: 0.1 };
const puntoLote = { id: 2, proyectoId: 7, escena: 'AEREA', etiqueta: 'C2', loteId: 1, loteCodigo: 'C2', yaw: 1, pitch: 0 };
const puntoEtapa = { id: 3, proyectoId: 7, escena: 'URBANISMO', etiqueta: 'Etapa B', etapaId: 5, etapaNombre: 'Etapa B', posX: 10, posY: 20 };
const puntoZona = { id: 4, proyectoId: 7, escena: 'ZONAS', etiqueta: 'Piscina', zonaComunId: 3, zonaComunNombre: 'Piscina', posX: 30, posY: 40 };
const fondoZonas = { id: 60, proyectoId: 7, tipo: 'ZONAS_DESTACADAS', url: 'https://x.com/fondo.jpg', activo: true, portada: false, publicado: true };
const imagenMapa = (id: number, orden: number, extra: object = {}) =>
  ({ id, proyectoId: 7, tipo: 'MAPA', url: `https://x.com/${id}.jpg`, titulo: `Mapa ${id}`, orden, portada: false, publicado: true, activo: true, ...extra });

interface Datos {
  puntos?: object[];
  todos?: object[];
  delProyecto?: object[];
}

describe('EditorPuntosComponent (plantilla)', () => {
  let http: HttpTestingController;

  async function montar(datos: Datos = {}, u: Ubicacion = ubicacion) {
    const fixture = TestBed.createComponent(EditorPuntosComponent);
    fixture.componentRef.setInput('ubicacion', u);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/puntos-360/proyecto/7')).flush(structuredClone(datos.puntos ?? []));
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/lotes')).flush([
      { id: 1, codigo: 'C2', areaM2: 800, activo: true, proyectoId: 7, estadoId: 1 },
      { id: 2, codigo: 'C10', areaM2: 900, activo: true, proyectoId: 7, estadoId: 1 },
      { id: 3, codigo: 'X1', areaM2: 500, activo: true, proyectoId: 99, estadoId: 1 },
    ]);
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/multimedia')).flush(structuredClone(datos.todos ?? []));
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/multimedia/proyecto/7')).flush(structuredClone(datos.delProyecto ?? []));
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/zonas-comunes/proyecto/7')).flush([
      { id: 3, proyectoId: 7, nombre: 'Piscina', activo: true },
      { id: 4, proyectoId: 7, nombre: 'Cancha', activo: true },
      { id: 8, proyectoId: 7, nombre: 'Borrada', activo: false },
    ]);
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/etapas/proyecto/7')).flush([{ id: 5, nombre: 'Etapa B' }, { id: 6, nombre: 'Etapa C' }]);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const avisos = () => TestBed.inject(ToastService).toasts().map(a => a.message);
  const esperar = () => new Promise(r => setTimeout(r, 0));
  const imagen = (nombre = 'a.jpg') => new File(['x'], nombre, { type: 'image/jpeg' });
  const pdf = () => new File(['x'], 'plano.pdf', { type: 'application/pdf' });

  function elegirArchivos(input: Element, ...archivos: File[]) {
    Object.defineProperty(input, 'files', { value: archivos, configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  function elegirOpcion(select: Element, indice: number) {
    (select as HTMLSelectElement).selectedIndex = indice;
    select.dispatchEvent(new Event('change'));
  }

  function escribir(input: Element, texto: string) {
    (input as HTMLInputElement).value = texto;
    input.dispatchEvent(new Event('input'));
  }

  function pestana(el: HTMLElement, texto: string) {
    const boton = Array.from(el.querySelectorAll<HTMLButtonElement>('.pestanas button')).find(b => b.textContent?.includes(texto));
    expect(boton, `pestaña "${texto}"`).toBeTruthy();
    boton!.click();
  }

  function boton(el: ParentNode, texto: string) {
    const encontrado = Array.from(el.querySelectorAll<HTMLElement>('button')).find(b => b.textContent?.trim() === texto);
    expect(encontrado, `botón "${texto}"`).toBeTruthy();
    return encontrado!;
  }

  const visor = (fixture: ComponentFixture<EditorPuntosComponent>) =>
    fixture.debugElement.query(By.directive(Visor360Component)).componentInstance as Visor360Component;

  function subidaCloudinary(url = 'https://res.cloudinary.com/x/image/upload/v1/nueva.jpg') {
    return vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(of({ url, resourceType: 'image' }) as never);
  }

  /** Atiende, cuando llegue, el próximo POST a /multimedia. */
  const responderPost = (cuerpo: object | null, estado = 200) =>
    vi.waitFor(() => {
      const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
      if (cuerpo === null) peticion.flush(null, { status: estado, statusText: 'Error' });
      else peticion.flush(cuerpo);
    });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ...provideI18nPruebas()] });
    // El visor real no arranca en jsdom (sin WebGL) y lo deja en la consola; aquí solo interesa lo que recibe y lo que emite
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  describe('estructura', () => {
    it('muestra el nombre del proyecto y una pestaña por cada imagen cargada, más Zonas destacadas y Mapa', async () => {
      const { el } = await montar();
      expect(el.querySelector('header p')?.textContent).toBe('La Hacienda');
      const pestanas = Array.from(el.querySelectorAll('.pestanas button')).map(b => b.textContent?.trim());
      expect(pestanas).toEqual(['Entorno 360°', 'Vista aérea 360°', 'Plano de urbanismo', 'Zonas destacadas', 'Mapa (imágenes)']);
      expect(el.querySelector('.pestanas button.activa')?.textContent).toContain('Entorno 360°');
      expect(el.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Botones sobre las imágenes 360°');
    });

    it('sin nombre de proyecto usa "Proyecto"; sin ninguna imagen avisa que hay que cargarla en la ubicación', async () => {
      const { el } = await montar({}, { ...ubicacion, proyectoNombre: undefined, recorrido360Url: '', vistaAereaUrl: '', urbanismoUrl: '' });
      expect(el.querySelector('header p')?.textContent).toBe('Proyecto');
      expect(el.querySelector('.vacio')?.textContent).toContain('todavía no tiene una imagen para ubicar botones');
      expect(el.querySelector('.cuerpo')).toBeNull();
    });

    it('la X y el fondo oscuro emiten "cerrar"', async () => {
      const { fixture, el } = await montar();
      const cerrar = vi.fn();
      fixture.componentInstance.cerrar.subscribe(cerrar);
      (el.querySelector('.cerrar') as HTMLElement).click();
      (el.querySelector('.fondo') as HTMLElement).click();
      expect(cerrar).toHaveBeenCalledTimes(2);
    });

    it('la pestaña Mapa muestra cuántas imágenes tiene', async () => {
      const { el } = await montar({ delProyecto: [imagenMapa(2, 1), imagenMapa(3, 2)] });
      expect(el.querySelector('.pestanas button:last-child')?.textContent).toContain('Mapa (imágenes) · 2');
    });
  });

  describe('entorno 360° (lugares cercanos)', () => {
    it('hacer clic en la imagen marca el lugar; se escribe el nombre y se guarda como rótulo', async () => {
      const { fixture, el } = await montar({ puntos: [lugar] });
      expect(el.querySelector('.paso')?.textContent).toContain('1. Haz clic en la imagen');
      expect(el.querySelector('.ayuda')?.textContent).toContain('Arrastra para girar');
      expect(visor(fixture).url()).toBe(ubicacion.recorrido360Url);
      expect(visor(fixture).titulo()).toBe('Entorno 360°');
      expect(visor(fixture).pista360()).toBe(false);
      expect(visor(fixture).puntos().map(p => p.etiqueta)).toEqual(['Jericó']);

      visor(fixture).clicEnImagen.emit({ yaw: 3, pitch: 1 });
      fixture.detectChanges();
      expect(visor(fixture).pendiente()).toEqual({ yaw: 3, pitch: 1 });
      expect(el.querySelector('.paso.listo')?.textContent).toContain('Ahora escribe el nombre del lugar.');
      expect(el.querySelector('.nuevo label')?.textContent).toContain('Nombre del lugar');
      expect(el.querySelector('.nuevo')?.textContent).toContain('Un lugar cercano es solo un rótulo');
      expect(el.querySelector('select')).toBeNull();
      const guardar = boton(el, 'Guardar botón') as HTMLButtonElement;
      expect(guardar.disabled).toBe(true);

      escribir(el.querySelector('.nuevo input[type="text"]')!, 'Armenia · 20 min');
      fixture.detectChanges();
      expect(guardar.disabled).toBe(false);
      guardar.click();
      fixture.detectChanges();
      expect(boton(el, 'Guardando...').hasAttribute('disabled')).toBe(true);

      const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
      expect(peticion.request.body).toMatchObject({ escena: 'ENTORNO', etiqueta: 'Armenia · 20 min', yaw: 3, pitch: 1 });
      peticion.flush({ id: 20, proyectoId: 7, escena: 'ENTORNO', etiqueta: 'Armenia · 20 min', yaw: 3, pitch: 1 });
      fixture.detectChanges();

      expect(avisos()).toContain('Botón guardado');
      expect(el.querySelectorAll('.lista li .nombre').length).toBe(2);
      expect(el.querySelector('.paso')?.textContent).toContain('1. Haz clic');
      expect(el.querySelector('.lista h4')?.textContent).toContain('(2)');
    });

    it('"Cancelar" descarta el lugar marcado', async () => {
      const { fixture, c, el } = await montar();
      c.clicEn360({ yaw: 1, pitch: 1 });
      fixture.detectChanges();
      boton(el, 'Cancelar').click();
      fixture.detectChanges();
      expect(c.hayPendiente()).toBe(false);
      expect(el.querySelector('.paso.listo')).toBeNull();
    });

    it('si el servidor rechaza el botón avisa y deja volver a intentarlo', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { fixture, c, el } = await montar();
      c.clicEn360({ yaw: 1, pitch: 1 });
      c.etiqueta.set('Río');
      fixture.detectChanges();
      boton(el, 'Guardar botón').click();
      http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360')).flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();

      expect(consola).toHaveBeenCalled();
      expect(avisos()).toContain('No se pudo guardar el botón. Revisa los datos e inténtalo de nuevo.');
      expect(c.guardando()).toBe(false);
      expect((boton(el, 'Guardar botón') as HTMLButtonElement).disabled).toBe(false);
      expect(c.hayPendiente()).toBe(true);
    });

    it('guardar sin datos completos no envía nada', async () => {
      const { c } = await montar();
      c.guardar();
      c.clicEn360({ yaw: 1, pitch: 1 });
      c.guardar();
      http.expectNone(r => r.method === 'POST');
      expect(c.puedeGuardar()).toBe(false);
    });

    it('un lugar existente se lista con la etiqueta "Lugar" y "Ver" gira el visor hasta él', async () => {
      const { fixture, c, el } = await montar({ puntos: [lugar] });
      const fila = el.querySelector('.lista li') as HTMLElement;
      expect(fila.querySelector('.nombre')?.textContent).toBe('Jericó');
      expect(fila.querySelector('.etiqueta-lugar')?.textContent).toBe('Lugar');

      const irA = vi.spyOn(visor(fixture), 'irA');
      boton(fila, 'Ver').click();
      expect(irA).toHaveBeenCalledWith({ yaw: 0.5, pitch: 0.1 });

      c.verEnLaImagen({ proyectoId: 7, escena: 'ENTORNO', etiqueta: 'sin ángulos', yaw: null, pitch: null });
      expect(irA).toHaveBeenCalledTimes(1);
    });

    it('sin botones muestra el texto de lista vacía', async () => {
      const { el } = await montar();
      expect(el.querySelector('.sin-puntos')?.textContent).toContain('Todavía no hay botones en esta imagen.');
    });
  });

  describe('quitar un botón', () => {
    it('al confirmar lo elimina de la lista', async () => {
      const { fixture, el } = await montar({ puntos: [lugar] });
      const dialogo = TestBed.inject(ConfirmDialogService);
      boton(el, 'Quitar').click();
      expect(dialogo.config().message).toContain('Jericó');
      dialogo.confirm();
      await esperar();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/puntos-360/1')).flush(null);
      fixture.detectChanges();
      expect(el.querySelector('.sin-puntos')).not.toBeNull();
    });

    it('si se cancela, no hay id, o el servidor falla, el botón se queda', async () => {
      const { fixture, c, el } = await montar({ puntos: [lugar] });
      const dialogo = TestBed.inject(ConfirmDialogService);

      await c.quitar({ proyectoId: 7, escena: 'ENTORNO', etiqueta: 'x' });
      boton(el, 'Quitar').click();
      dialogo.cancel();
      await esperar();
      http.expectNone(r => r.method === 'DELETE');

      boton(el, 'Quitar').click();
      dialogo.confirm();
      await esperar();
      http.expectOne(r => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(avisos()).toContain('No se pudo quitar el botón.');
      expect(c.puntos().length).toBe(1);
    });
  });

  describe('vista aérea (lotes)', () => {
    it('elegir un lote rellena el texto del botón y permite guardarlo; el lote usado deja de ofrecerse', async () => {
      const { fixture, el } = await montar({ puntos: [puntoLote] });
      pestana(el, 'Vista aérea');
      fixture.detectChanges();
      expect(visor(fixture).url()).toBe(ubicacion.vistaAereaUrl);
      visor(fixture).clicEnImagen.emit({ yaw: 2, pitch: 0.3 });
      fixture.detectChanges();

      expect(el.querySelector('.paso.listo')?.textContent).toContain('Ahora elige a qué apunta.');
      const select = el.querySelector('.nuevo select') as HTMLSelectElement;
      const opciones = Array.from(select.options).map(o => o.textContent?.trim());
      expect(opciones.length).toBe(2);
      expect(opciones[0]).toBe('Elige un lote');
      expect(opciones[1]).toContain('C10');

      elegirOpcion(select, 1);
      fixture.detectChanges();
      await fixture.whenStable();
      expect((el.querySelector('.nuevo input[type="text"]') as HTMLInputElement).value).toBe('C10');

      boton(el, 'Guardar botón').click();
      const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
      expect(peticion.request.body).toMatchObject({ escena: 'AEREA', loteId: 2, etiqueta: 'C10', yaw: 2, pitch: 0.3 });
      peticion.flush({ ...puntoLote, id: 30, etiqueta: 'C10', loteId: 2, loteCodigo: 'C10' });
      fixture.detectChanges();
      expect(el.querySelectorAll('.lista li').length).toBe(2);
    });

    it('un lote con su 360° ya subido muestra la marca y "Cambiar 360°"; sin ella, "Subir 360°"', async () => {
      const { fixture, el } = await montar({
        puntos: [puntoLote, { ...puntoLote, id: 5, etiqueta: 'C10', loteId: 2, loteCodigo: 'C10' }],
        todos: [{ id: 40, loteId: 1, tipo: 'PANORAMICA_360', url: 'https://x/1.jpg', activo: true }],
      });
      pestana(el, 'Vista aérea');
      fixture.detectChanges();
      const filas = el.querySelectorAll('.lista li');
      expect(filas[0].querySelector('.con-360')?.textContent).toContain('360° ✓');
      expect(filas[0].querySelector('.subir')?.textContent).toContain('Cambiar 360°');
      expect(filas[1].querySelector('.con-360')).toBeNull();
      expect(filas[1].querySelector('.subir')?.textContent).toContain('Subir 360°');
    });

    async function abrirAerea(datos: Datos) {
      const base = await montar({ puntos: [puntoLote], ...datos });
      pestana(base.el, 'Vista aérea');
      base.fixture.detectChanges();
      return { ...base, input: base.el.querySelector('.lista li input[type="file"]')! };
    }

    it('subir la 360° la guarda, reemplaza la anterior y avisa', async () => {
      const { fixture, c, el, input } = await abrirAerea({ todos: [{ id: 40, loteId: 1, tipo: 'PANORAMICA_360', url: 'https://x/vieja.jpg', activo: true }] });
      const subida = subidaCloudinary();
      elegirArchivos(input, imagen('lote.jpg'));
      fixture.detectChanges();
      expect(c.subiendoLote()).toBe(1);
      expect(el.querySelector('.lista li .subir')?.textContent).toContain('Subiendo...');

      http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia')).flush({ id: 50, loteId: 1, tipo: 'PANORAMICA_360', url: 'https://x/n.jpg', activo: true });
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/40')).flush(null);
      fixture.detectChanges();

      expect(subida).toHaveBeenCalledTimes(1);
      expect(avisos()).toContain('Imagen 360° del lote guardada');
      expect(c.panoramas().get(1)?.id).toBe(50);
      expect(c.subiendoLote()).toBeNull();
    });

    it('un archivo que no es imagen se rechaza sin subir nada', async () => {
      const { c, input } = await abrirAerea({});
      const subida = subidaCloudinary();
      elegirArchivos(input, pdf());
      expect(subida).not.toHaveBeenCalled();
      expect(avisos().some(m => m.includes('Sube imágenes'))).toBe(true);
      expect(c.subiendoLote()).toBeNull();
    });

    it('sin archivo elegido no hace nada', async () => {
      const { c, input } = await abrirAerea({});
      const subida = subidaCloudinary();
      elegirArchivos(input);
      expect(subida).not.toHaveBeenCalled();
      expect(c.subiendoLote()).toBeNull();
    });

    it('si Cloudinary falla avisa y libera el botón', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c, input } = await abrirAerea({});
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(throwError(() => new Error('x')));
      elegirArchivos(input, imagen());
      expect(consola).toHaveBeenCalled();
      expect(avisos()).toContain('No se pudo subir la imagen. Inténtalo de nuevo.');
      expect(c.subiendoLote()).toBeNull();
    });

    it('si la imagen se sube pero no se puede guardar en el lote lo avisa', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c, input } = await abrirAerea({});
      subidaCloudinary();
      elegirArchivos(input, imagen());
      http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia')).flush(null, { status: 500, statusText: 'Error' });
      expect(avisos()).toContain('La imagen se subió pero no se pudo guardar en el lote.');
      expect(c.subiendoLote()).toBeNull();
      expect(c.panoramas().size).toBe(0);
    });
  });

  describe('plano de urbanismo (etapas)', () => {
    async function abrirPlano(datos: Datos = {}) {
      const base = await montar(datos);
      pestana(base.el, 'Plano de urbanismo');
      base.fixture.detectChanges();
      return base;
    }

    it('hacer clic en el plano marca el lugar, se elige la etapa y se guarda con su posición en porcentaje', async () => {
      const { fixture, el } = await abrirPlano();
      expect(el.querySelector('app-plano-puntos')).not.toBeNull();
      expect(el.querySelector('.ayuda')?.textContent).toContain('Haz clic en el plano donde va el botón de la etapa.');

      const caja = el.querySelector('.caja') as HTMLElement;
      caja.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
      caja.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 25, bubbles: true }));
      fixture.detectChanges();
      expect(el.querySelector('.pendiente')).not.toBeNull();

      const select = el.querySelector('.nuevo select') as HTMLSelectElement;
      expect(Array.from(select.options).map(o => o.textContent?.trim())).toEqual(['Elige una etapa', 'Etapa B', 'Etapa C']);
      elegirOpcion(select, 2);
      fixture.detectChanges();
      await fixture.whenStable();
      expect((el.querySelector('.nuevo input[type="text"]') as HTMLInputElement).value).toBe('Etapa C');

      boton(el, 'Guardar botón').click();
      const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
      expect(peticion.request.body).toMatchObject({ escena: 'URBANISMO', etapaId: 6, etiqueta: 'Etapa C', posX: 25, posY: 25 });
      peticion.flush({ ...puntoEtapa, id: 31, etapaId: 6, etiqueta: 'Etapa C' });
    });

    it('los botones de etapa muestran cuántas imágenes tienen y se despliegan para verlas y quitarlas', async () => {
      const { fixture, c, el } = await abrirPlano({
        puntos: [puntoEtapa, { ...puntoEtapa, id: 9, etiqueta: 'Etapa C', etapaId: 6 }],
        todos: [
          { id: 31, etapaId: 5, tipo: 'IMAGEN', url: 'https://x/e1.jpg', titulo: 'Etapa B 1', orden: 2, activo: true },
          { id: 30, etapaId: 5, tipo: 'PLANO', url: 'https://x/e0.jpg', titulo: '', orden: 1, activo: true },
        ],
      });
      const chips = el.querySelectorAll<HTMLButtonElement>('.chip-imagenes');
      expect(chips[0].textContent?.trim()).toBe('2 imágenes');
      expect(chips[1].textContent?.trim()).toBe('0 imágenes');
      expect(chips[0].getAttribute('aria-expanded')).toBe('false');

      chips[0].click();
      fixture.detectChanges();
      expect(chips[0].getAttribute('aria-expanded')).toBe('true');
      const imagenes = el.querySelectorAll('.imagenes-etapa figure img');
      expect(imagenes.length).toBe(2);
      expect(imagenes[0].getAttribute('src')).toBe('https://x/e0.jpg');
      expect(imagenes[0].getAttribute('alt')).toBe('Imagen de la etapa');

      el.querySelectorAll<HTMLButtonElement>('.chip-imagenes')[1].click();
      fixture.detectChanges();
      expect(el.querySelector('.imagenes-etapa')?.textContent).toContain('Esta etapa todavía no tiene imágenes.');

      c.alternarEtapa(puntoEtapa as never);
      fixture.detectChanges();
      expect(c.etapaAbierta()).toBe(5);
      c.alternarEtapa(puntoEtapa as never);
      expect(c.etapaAbierta()).toBeNull();
    });

    it('un solo recurso se cuenta en singular', async () => {
      const { el } = await abrirPlano({ puntos: [puntoEtapa], todos: [{ id: 31, etapaId: 5, tipo: 'IMAGEN', url: 'https://x/e1.jpg', activo: true }] });
      expect(el.querySelector('.chip-imagenes')?.textContent?.trim()).toBe('1 imagen');
    });

    it('quitar una imagen de la etapa pide confirmación y la borra; con error avisa', async () => {
      const { fixture, c, el } = await abrirPlano({
        puntos: [puntoEtapa],
        todos: [{ id: 31, etapaId: 5, tipo: 'IMAGEN', url: 'https://x/e1.jpg', titulo: 'Etapa B 1', orden: 1, activo: true }],
      });
      const dialogo = TestBed.inject(ConfirmDialogService);
      c.alternarEtapa(puntoEtapa as never);
      fixture.detectChanges();
      const quitar = () => el.querySelector('figure button') as HTMLElement;

      quitar().click();
      expect(dialogo.config().message).toContain('Etapa B 1');
      dialogo.cancel();
      await esperar();
      http.expectNone(r => r.method === 'DELETE');

      quitar().click();
      dialogo.confirm();
      await esperar();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/31')).flush(null, { status: 500, statusText: 'Error' });
      expect(avisos()).toContain('No se pudo quitar la imagen.');

      quitar().click();
      dialogo.confirm();
      await esperar();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/31')).flush(null);
      fixture.detectChanges();
      expect(el.querySelector('figure')).toBeNull();
      expect(c.imagenesDe(puntoEtapa as never)).toEqual([]);

      await c.quitarImagenEtapa({ id: 99 } as never);
      expect(c.imagenesDe({ proyectoId: 7, escena: 'URBANISMO', etiqueta: 'x' })).toEqual([]);
    });

    it('subir varias imágenes de la etapa crea un recurso por cada una y abre la lista', async () => {
      const { fixture, c, el } = await abrirPlano({ puntos: [puntoEtapa] });
      subidaCloudinary();
      const input = el.querySelector('.lista li input[multiple]')!;
      elegirArchivos(input, imagen('a.jpg'), imagen('b.jpg'));
      expect(c.subiendoEtapa()).toBe(5);

      await responderPost({ id: 70, etapaId: 5, tipo: 'IMAGEN', url: 'https://x/a.jpg', orden: 1, activo: true });
      await responderPost({ id: 71, etapaId: 5, tipo: 'IMAGEN', url: 'https://x/b.jpg', orden: 2, activo: true });
      await vi.waitFor(() => expect(c.subiendoEtapa()).toBeNull());
      fixture.detectChanges();

      expect(avisos()).toContain('2 imágenes de la etapa guardadas');
      expect(c.etapaAbierta()).toBe(5);
      expect(el.querySelectorAll('.imagenes-etapa figure').length).toBe(2);
    });

    it('subir una sola imagen avisa en singular y el título lleva el orden siguiente', async () => {
      const { c, el } = await abrirPlano({ puntos: [puntoEtapa] });
      subidaCloudinary();
      elegirArchivos(el.querySelector('.lista li input[multiple]')!, imagen('a.jpg'));
      await vi.waitFor(() => {
        const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
        expect(peticion.request.body).toMatchObject({ etapaId: 5, tipo: 'IMAGEN', titulo: 'Etapa B 1', orden: 1 });
        peticion.flush({ id: 70, etapaId: 5, tipo: 'IMAGEN', url: 'https://x/a.jpg', activo: true });
      });
      await vi.waitFor(() => expect(c.subiendoEtapa()).toBeNull());
      expect(avisos()).toContain('Imagen de la etapa guardada');
    });

    it('las imágenes de la etapa rechazan archivos inválidos, vacíos y los fallos de subida', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c, el } = await abrirPlano({ puntos: [puntoEtapa] });
      const subida = subidaCloudinary();
      const input = el.querySelector('.lista li input[multiple]')!;

      elegirArchivos(input);
      elegirArchivos(input, imagen('a.jpg'), pdf());
      expect(avisos().some(m => m.startsWith('plano.pdf: '))).toBe(true);
      expect(subida).not.toHaveBeenCalled();

      subida.mockReturnValue(throwError(() => new Error('x')));
      elegirArchivos(input, imagen('a.jpg'));
      await vi.waitFor(() => expect(avisos()).toContain('No se pudo subir la imagen de la etapa. Inténtalo de nuevo.'));
      expect(consola).toHaveBeenCalled();
      expect(c.subiendoEtapa()).toBeNull();
    });

    it('mientras otra etapa sube, no deja iniciar una segunda subida', async () => {
      const { c } = await abrirPlano({ puntos: [puntoEtapa] });
      const pendiente = new Subject<{ url: string; resourceType: string }>();
      const subida = vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(pendiente as never);
      const evento = { target: { files: [imagen()], value: '' } } as unknown as Event;
      const primera = c.subirEtapa(puntoEtapa as never, evento);
      await c.subirEtapa(puntoEtapa as never, evento);
      await c.subirEtapa360(puntoEtapa as never, evento);
      expect(subida).toHaveBeenCalledTimes(1);

      pendiente.error(new Error('x'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await primera;
      expect(c.subiendoEtapa()).toBeNull();
    });

    it('el 360° de la etapa se sube, reemplaza el anterior y la fila lo marca', async () => {
      const { fixture, c, el } = await abrirPlano({
        puntos: [puntoEtapa],
        todos: [{ id: 41, etapaId: 5, tipo: 'PANORAMICA_360', url: 'https://x/vieja.jpg', activo: true }],
      });
      const fila = el.querySelector('.lista li') as HTMLElement;
      expect(fila.querySelector('.con-360:not(.chip-imagenes)')?.textContent).toContain('360° ✓');
      expect(fila.textContent).toContain('Cambiar 360°');

      subidaCloudinary();
      elegirArchivos(fila.querySelectorAll('input[type="file"]')[1], imagen('p.jpg'));
      await responderPost({ id: 80, etapaId: 5, tipo: 'PANORAMICA_360', url: 'https://x/n.jpg', activo: true });
      await vi.waitFor(() => http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/41')).flush(null));
      await vi.waitFor(() => expect(c.subiendoEtapa()).toBeNull());
      fixture.detectChanges();

      expect(avisos()).toContain('Imagen 360° de la etapa guardada');
      expect(c.panoramasEtapa().get(5)?.id).toBe(80);
    });

    it('si falla guardar el 360° de la etapa avisa; archivo inválido o ausente se ignora', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c, el } = await abrirPlano({ puntos: [puntoEtapa] });
      const subida = subidaCloudinary();
      const input = el.querySelectorAll('.lista li input[type="file"]')[1];
      expect(el.querySelector('.lista li')?.textContent).toContain('Subir 360°');

      elegirArchivos(input);
      elegirArchivos(input, pdf());
      expect(subida).not.toHaveBeenCalled();

      elegirArchivos(input, imagen());
      await responderPost(null, 500);
      await vi.waitFor(() => expect(avisos()).toContain('No se pudo guardar la imagen 360° de la etapa.'));
      expect(c.subiendoEtapa()).toBeNull();
    });
  });

  describe('zonas destacadas', () => {
    it('sin imagen de fondo pide subirla primero', async () => {
      const { fixture, el } = await montar();
      pestana(el, 'Zonas destacadas');
      fixture.detectChanges();
      expect(el.querySelector('.zonas-imagen')?.textContent).toContain('+ Subir imagen de fondo');
      expect(el.querySelector('.nuevo .paso')?.textContent).toContain('Primero sube la imagen de fondo');
      expect(el.querySelector('app-plano-puntos')).toBeNull();
      expect(el.querySelector('.ayuda')?.textContent?.trim()).toBe('');
    });

    it('con imagen de fondo se coloca el botón de una amenidad libre y se guarda', async () => {
      const { fixture, el } = await montar({ delProyecto: [fondoZonas], puntos: [puntoZona] });
      pestana(el, 'Zonas destacadas');
      fixture.detectChanges();
      expect(el.querySelector('.zonas-imagen')?.textContent).toContain('Cambiar imagen');
      expect(el.querySelector('app-plano-puntos')).not.toBeNull();
      expect(el.querySelector('.ayuda')?.textContent).toContain('Haz clic en la imagen donde va el botón de la amenidad.');

      const caja = el.querySelector('.caja') as HTMLElement;
      caja.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
      caja.dispatchEvent(new MouseEvent('click', { clientX: 60, clientY: 70, bubbles: true }));
      fixture.detectChanges();

      const select = el.querySelector('.nuevo select') as HTMLSelectElement;
      // Piscina ya tiene botón y Borrada está inactiva: solo queda Cancha
      expect(Array.from(select.options).map(o => o.textContent?.trim())).toEqual(['Elige una amenidad', 'Cancha']);
      elegirOpcion(select, 1);
      fixture.detectChanges();
      await fixture.whenStable();
      expect((el.querySelector('.nuevo input[type="text"]') as HTMLInputElement).value).toBe('Cancha');

      boton(el, 'Guardar botón').click();
      const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/puntos-360'));
      expect(peticion.request.body).toMatchObject({ escena: 'ZONAS', zonaComunId: 4, etapaId: null, loteId: null, posX: 60, posY: 70 });
      peticion.flush({ ...puntoZona, id: 90, zonaComunId: 4, etiqueta: 'Cancha' });
    });

    it('subir la imagen de fondo reemplaza la anterior', async () => {
      const { fixture, c, el } = await montar({ delProyecto: [fondoZonas] });
      pestana(el, 'Zonas destacadas');
      fixture.detectChanges();
      subidaCloudinary();
      elegirArchivos(el.querySelector('.zonas-imagen input')!, imagen('fondo.jpg'));
      expect(c.subiendoImagenZonas()).toBe(true);
      await responderPost({ ...fondoZonas, id: 61 });
      await vi.waitFor(() => http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/60')).flush(null));
      await vi.waitFor(() => expect(c.subiendoImagenZonas()).toBe(false));

      expect(c.imagenZonas()?.id).toBe(61);
      expect(avisos()).toContain('Imagen de las zonas destacadas guardada');
    });

    it('la imagen de fondo rechaza archivos inválidos, vacíos y los fallos del servidor', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c } = await montar();
      const subida = subidaCloudinary();
      const evento = (...f: File[]) => ({ target: { files: f, value: '' } }) as unknown as Event;

      await c.subirImagenZonas(evento());
      await c.subirImagenZonas(evento(pdf()));
      expect(subida).not.toHaveBeenCalled();
      expect(avisos().some(m => m.includes('Sube imágenes'))).toBe(true);

      const intento = c.subirImagenZonas(evento(imagen()));
      await responderPost(null, 500);
      await intento;
      expect(avisos()).toContain('No se pudo subir la imagen. Inténtalo de nuevo.');
      expect(consola).toHaveBeenCalled();
      expect(c.subiendoImagenZonas()).toBe(false);
    });

    it('una amenidad con botón permite subir su 360°, que se reemplaza si ya tenía una', async () => {
      const { fixture, c, el } = await montar({
        delProyecto: [fondoZonas],
        puntos: [puntoZona, { ...puntoZona, id: 5, zonaComunId: 4, etiqueta: 'Cancha', zonaComunNombre: 'Cancha' }],
        todos: [{ id: 41, zonaComunId: 3, tipo: 'PANORAMICA_360', url: 'https://x/vieja.jpg', activo: true }],
      });
      pestana(el, 'Zonas destacadas');
      fixture.detectChanges();
      const filas = el.querySelectorAll('.lista li');
      expect(filas[0].querySelector('.con-360')?.textContent).toContain('360° ✓');
      expect(filas[0].querySelector('.subir')?.textContent).toContain('Cambiar 360°');
      expect(filas[1].querySelector('.con-360')).toBeNull();
      expect(filas[1].querySelector('.subir')?.textContent).toContain('Subir 360°');

      subidaCloudinary();
      elegirArchivos(filas[0].querySelector('input')!, imagen('p.jpg'));
      fixture.detectChanges();
      expect(el.querySelector('.lista li .subir')?.textContent).toContain('Subiendo...');
      await responderPost({ id: 81, zonaComunId: 3, tipo: 'PANORAMICA_360', url: 'https://x/n.jpg', activo: true });
      await vi.waitFor(() => http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/41')).flush(null));
      await vi.waitFor(() => expect(c.subiendoZona()).toBeNull());

      expect(avisos()).toContain('Imagen 360° de la amenidad guardada');
      expect(c.panoramasZona().get(3)?.id).toBe(81);
    });

    it('el 360° de una amenidad rechaza archivos inválidos, vacíos y los fallos', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c } = await montar();
      const subida = subidaCloudinary();
      const punto = { proyectoId: 7, escena: 'ZONAS', etiqueta: 'Piscina', zonaComunId: 3 } as never;
      const evento = (...f: File[]) => ({ target: { files: f, value: '' } }) as unknown as Event;

      await c.subirZona360(punto, evento());
      await c.subirZona360({ proyectoId: 7, escena: 'ZONAS', etiqueta: 'x' }, evento(imagen()));
      await c.subirZona360(punto, evento(pdf()));
      expect(subida).not.toHaveBeenCalled();

      const intento = c.subirZona360(punto, evento(imagen()));
      await responderPost(null, 500);
      await intento;
      expect(avisos()).toContain('No se pudo guardar la imagen 360° de la amenidad.');
      expect(consola).toHaveBeenCalled();
      expect(c.subiendoZona()).toBeNull();
    });

    it('elegir una zona inexistente no cambia el texto del botón', async () => {
      const { c } = await montar();
      c.elegirZona(999);
      expect(c.etiqueta()).toBe('');
      c.elegirLote(999);
      c.elegirEtapa(999);
      expect(c.etiqueta()).toBe('');
    });
  });

  describe('pestaña Mapa', () => {
    it('sin imágenes explica que se verá el mapa interactivo', async () => {
      const { fixture, el } = await montar();
      pestana(el, 'Mapa');
      fixture.detectChanges();
      expect(el.querySelector('.mapa-gestor .sin-puntos')?.textContent).toContain('Todavía no hay imágenes del mapa');
      expect(el.querySelector('.cuerpo')).toBeNull();
    });

    it('lista las imágenes numeradas, con subir/bajar deshabilitados en los extremos', async () => {
      const { fixture, el } = await montar({ delProyecto: [imagenMapa(2, 1), imagenMapa(3, 2, { titulo: '', nombreArchivo: 'tres.jpg' }), imagenMapa(4, 3, { titulo: '' })] });
      pestana(el, 'Mapa');
      fixture.detectChanges();
      const filas = el.querySelectorAll('.mapa-lista li');
      expect(filas.length).toBe(3);
      expect(filas[0].querySelector('.posicion')?.textContent).toBe('1');
      expect(filas[1].querySelector('.nombre')?.textContent).toBe('tres.jpg');
      expect(filas[2].querySelector('.nombre')?.textContent).toBe('Imagen del mapa');
      expect((filas[0].querySelector('[aria-label="Subir"]') as HTMLButtonElement).disabled).toBe(true);
      expect((filas[2].querySelector('[aria-label="Bajar"]') as HTMLButtonElement).disabled).toBe(true);
      expect((filas[1].querySelector('[aria-label="Bajar"]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('bajar una imagen intercambia el orden con la vecina y lo guarda', async () => {
      const { fixture, el } = await montar({ delProyecto: [imagenMapa(2, 1), imagenMapa(3, 2)] });
      pestana(el, 'Mapa');
      fixture.detectChanges();
      (el.querySelector('.mapa-lista li [aria-label="Bajar"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(Array.from(el.querySelectorAll('.mapa-lista .nombre')).map(n => n.textContent)).toEqual(['Mapa 3', 'Mapa 2']);

      await vi.waitFor(() => {
        http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/multimedia/3')).flush({});
        http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/multimedia/2')).flush({});
      });
    });

    it('si falla guardar el nuevo orden lo deshace y avisa', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { fixture, c, el } = await montar({ delProyecto: [imagenMapa(2, 1), imagenMapa(3, 2)] });
      pestana(el, 'Mapa');
      fixture.detectChanges();
      const movimiento = c.moverMapa(c.imagenesMapa()[0], 1);
      http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/multimedia/3')).flush(null, { status: 500, statusText: 'Error' });
      http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/multimedia/2')).flush(null, { status: 500, statusText: 'Error' });
      await movimiento;
      expect(c.imagenesMapa().map(m => m.id)).toEqual([2, 3]);
      expect(avisos()).toContain('No se pudo cambiar el orden. Inténtalo de nuevo.');
    });

    it('mover más allá de los extremos o una imagen desconocida no hace nada', async () => {
      const { c } = await montar({ delProyecto: [imagenMapa(2, 1)] });
      await c.moverMapa(c.imagenesMapa()[0], -1);
      await c.moverMapa(c.imagenesMapa()[0], 1);
      await c.moverMapa(imagenMapa(99, 1) as never, 1);
      http.expectNone(r => r.method === 'PUT');
    });

    it('"Quitar" pide confirmación, borra la imagen y, si falla, avisa', async () => {
      const { fixture, c, el } = await montar({ delProyecto: [imagenMapa(2, 1)] });
      pestana(el, 'Mapa');
      fixture.detectChanges();
      const dialogo = TestBed.inject(ConfirmDialogService);
      const quitar = () => boton(el.querySelector('.mapa-lista') as HTMLElement, 'Quitar');

      quitar().click();
      expect(dialogo.config().message).toContain('Mapa 2');
      dialogo.cancel();
      await esperar();
      http.expectNone(r => r.method === 'DELETE');

      quitar().click();
      dialogo.confirm();
      await esperar();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/2')).flush(null, { status: 500, statusText: 'Error' });
      expect(avisos()).toContain('No se pudo quitar la imagen.');

      quitar().click();
      dialogo.confirm();
      await esperar();
      http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/multimedia/2')).flush(null);
      fixture.detectChanges();
      expect(c.imagenesMapa()).toEqual([]);
      expect(el.querySelector('.mapa-lista .sin-puntos')).not.toBeNull();

      await c.quitarMapa({ titulo: 'sin id' } as never);
    });

    it('subir una imagen del mapa la agrega al final y avisa; con varias, avisa el total', async () => {
      const { fixture, c, el } = await montar({ delProyecto: [imagenMapa(2, 4)] });
      pestana(el, 'Mapa');
      fixture.detectChanges();
      subidaCloudinary();
      const input = el.querySelector('.subir-mapa input')!;

      elegirArchivos(input, imagen('a.jpg'));
      fixture.detectChanges();
      expect(el.querySelector('.subir-mapa')?.textContent).toContain('Subiendo...');
      await vi.waitFor(() => {
        const peticion = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/multimedia'));
        expect(peticion.request.body).toMatchObject({ proyectoId: 7, tipo: 'MAPA', orden: 5, titulo: 'Mapa 5' });
        peticion.flush(imagenMapa(20, 5));
      });
      await vi.waitFor(() => expect(c.subiendoMapa()).toBe(false));
      expect(avisos()).toContain('Imagen del mapa guardada');

      elegirArchivos(input, imagen('b.jpg'), imagen('c.jpg'));
      await responderPost(imagenMapa(21, 6));
      await responderPost(imagenMapa(22, 7));
      await vi.waitFor(() => expect(c.subiendoMapa()).toBe(false));
      expect(avisos()).toContain('2 imágenes del mapa guardadas');
      fixture.detectChanges();
      expect(el.querySelector('.pestanas button:last-child')?.textContent).toContain('· 4');
    });

    it('rechaza archivos inválidos con el nombre del archivo y avisa si la subida falla', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { c, el } = await montar();
      pestana(el, 'Mapa');
      const subida = subidaCloudinary();
      const evento = (...f: File[]) => ({ target: { files: f, value: '' } }) as unknown as Event;

      await c.subirMapa(evento());
      await c.subirMapa(evento(imagen(), pdf()));
      expect(avisos().some(m => m.startsWith('plano.pdf: '))).toBe(true);
      expect(subida).not.toHaveBeenCalled();

      subida.mockReturnValue(throwError(() => new Error('x')));
      await c.subirMapa(evento(imagen()));
      expect(avisos()).toContain('No se pudo subir la imagen del mapa. Inténtalo de nuevo.');
      expect(consola).toHaveBeenCalled();
      expect(c.subiendoMapa()).toBe(false);
    });

    it('volver a una pestaña de imagen desde Mapa limpia el estado', async () => {
      const { fixture, c, el } = await montar();
      pestana(el, 'Mapa');
      fixture.detectChanges();
      expect(c.mapaActivo()).toBe(true);
      pestana(el, 'Entorno 360°');
      fixture.detectChanges();
      expect(c.mapaActivo()).toBe(false);
      expect(el.querySelector('app-visor-360')).not.toBeNull();
    });
  });

  describe('errores al cargar', () => {
    it('si fallan los botones y los lotes avisa; el resto de cargas falla en silencio', async () => {
      const fixture = TestBed.createComponent(EditorPuntosComponent);
      fixture.componentRef.setInput('ubicacion', ubicacion);
      fixture.detectChanges();
      await Promise.resolve();
      const error = { status: 500, statusText: 'Error' };
      http.expectOne(r => r.url.endsWith('/puntos-360/proyecto/7')).flush(null, error);
      http.expectOne(r => r.method === 'GET' && r.url.endsWith('/lotes')).flush(null, error);
      http.expectOne(r => r.method === 'GET' && r.url.endsWith('/multimedia')).flush(null, error);
      http.expectOne(r => r.url.endsWith('/multimedia/proyecto/7')).flush(null, error);
      http.expectOne(r => r.url.endsWith('/zonas-comunes/proyecto/7')).flush(null, error);
      http.expectOne(r => r.url.endsWith('/etapas/proyecto/7')).flush(null, error);

      expect(avisos()).toEqual(['No se pudieron cargar los botones del proyecto.', 'No se pudieron cargar los lotes.']);
      expect(fixture.componentInstance.puntos()).toEqual([]);
    });
  });
});
