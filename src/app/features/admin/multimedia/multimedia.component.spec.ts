import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MultimediaComponent } from './multimedia.component';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

const visor = vi.hoisted(() => ({ destroy: vi.fn(), opciones: [] as unknown[] }));

vi.mock('@photo-sphere-viewer/core', () => ({
  Viewer: class {
    constructor(opciones: unknown) {
      visor.opciones.push(opciones);
    }
    destroy() {
      visor.destroy();
    }
  },
}));

const MULTIMEDIA = `${environment.apiUrl}/multimedia`;

const recursos = [
  { id: 1, tipo: 'IMAGEN', titulo: 'Fachada', url: 'https://x/f.jpg', proyectoId: 1, proyectoNombre: 'El Encanto', portada: true, publicado: true, activo: true, descripcion: 'Foto' },
  { id: 2, tipo: 'VIDEO', titulo: 'Recorrido', url: 'https://x/v.mp4', loteId: 3, loteCodigo: 'L-03', portada: false, publicado: true, activo: true },
  { id: 3, tipo: 'PDF', titulo: 'Brochure', url: 'https://x/b.pdf', zonaComunId: 4, zonaComunNombre: 'Piscina', portada: false, publicado: true, activo: true },
  { id: 4, tipo: 'PANORAMICA_360', titulo: '', url: 'https://x/p.jpg', casaModeloId: 5, casaModeloNombre: 'Villa Samán', portada: false, publicado: true, activo: true },
  { id: 5, tipo: 'PLANO', titulo: 'Plano', url: 'https://x/pl.pdf', etapaId: 6, etapaNombre: 'Etapa 1', portada: false, publicado: true, activo: true },
  { id: 6, tipo: 'OTRO', titulo: 'Suelto', url: 'https://x/o.zip', portada: false, publicado: false, activo: true, nombreArchivo: 'o.zip', mimeType: 'application/zip', tamanoBytes: 10, orden: 3 },
];

describe('MultimediaComponent', () => {
  let http: HttpTestingController;

  function crear(lista: unknown[] = recursos) {
    TestBed.configureTestingModule({
      imports: [MultimediaComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(MultimediaComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(MULTIMEDIA).flush(structuredClone(lista));
    http.expectOne(`${environment.apiUrl}/proyectos`).flush([{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }]);
    http.expectOne(`${environment.apiUrl}/lotes`).flush([{ id: 3, codigo: 'L-03' }]);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();
  const esperar = () => new Promise((r) => setTimeout(r, 0));

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
    visor.destroy.mockClear();
    visor.opciones.length = 0;
  });

  describe('lista y filtros', () => {
    it('muestra una tarjeta por recurso con su vínculo y los textos de respaldo', () => {
      const { el } = crear();
      const tarjetas = el.querySelectorAll('.media-card');
      expect(tarjetas.length).toBe(6);
      const vinculos = Array.from(el.querySelectorAll('.media-vinculo')).map((v) => v.textContent?.trim());
      expect(vinculos).toEqual(['Proyecto: El Encanto', 'Lote: L-03', 'Amenidad: Piscina', 'Tipología: Villa Samán', 'Etapa: Etapa 1', 'Sin vínculo']);
      expect(tarjetas[3].querySelector('.media-title')?.textContent).toContain('Sin título');
      expect(tarjetas[1].querySelector('.media-desc')?.textContent).toContain('Sin descripción');
      expect(el.querySelectorAll('.badge-portada').length).toBe(1);
      expect(el.querySelector('.clickable-badge')?.textContent).toContain('360');
      expect(tarjetas[1].querySelector('video')).not.toBeNull();
      expect(tarjetas[2].querySelector('a.file-placeholder')?.textContent).toContain('PDF');
    });

    it('sin recursos muestra el estado vacío', () => {
      const { el } = crear([]);
      expect(el.querySelector('.empty-state')?.textContent).toContain('No se encontraron');
      expect(el.querySelector('.media-grid')).toBeNull();
    });

    it('si falla la carga avisa con un error y deja de cargar', () => {
      TestBed.configureTestingModule({ imports: [MultimediaComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(MultimediaComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(MULTIMEDIA).flush(null, { status: 500, statusText: 'Error' });
      http.expectOne(`${environment.apiUrl}/proyectos`).flush([]);
      http.expectOne(`${environment.apiUrl}/lotes`).flush([]);

      expect(consola).toHaveBeenCalled();
      expect(fixture.componentInstance.cargando).toBe(false);
      expect(avisos().some((a) => a.message === 'Error al cargar multimedia')).toBe(true);
    });

    it('filtra por título sin distinguir mayúsculas y por tipo', () => {
      const { fixture, c, el } = crear();
      const titulo = el.querySelector('#filtroTitulo') as HTMLInputElement;
      titulo.value = '  FACH';
      titulo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(c.multimediaFiltrada.map((m) => m.id)).toEqual([1]);

      titulo.value = '';
      titulo.dispatchEvent(new Event('input'));
      const tipo = el.querySelector('#filtroTipo') as HTMLSelectElement;
      tipo.value = 'VIDEO';
      tipo.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(c.multimediaFiltrada.map((m) => m.id)).toEqual([2]);

      c.filtroTitulo = 'zzz';
      c.aplicarFiltros();
      fixture.detectChanges();
      expect(el.querySelector('.empty-state')).not.toBeNull();
    });
  });

  describe('imagen ampliada', () => {
    it('al pulsar una imagen se amplía con su título y se cierra con la X y con el fondo', () => {
      const { fixture, c, el } = crear();
      (el.querySelectorAll('.media-preview')[0] as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-imagen-ampliada img')?.getAttribute('src')).toBe('https://x/f.jpg');
      expect(el.querySelector('.modal-imagen-ampliada h2')?.textContent).toBe('Fachada');

      (el.querySelector('.modal-imagen-ampliada') as HTMLElement).click();
      expect(c.imagenAmpliadaUrl).toBe('https://x/f.jpg');

      (el.querySelector('.modal-imagen-ampliada .btn-close') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-imagen-ampliada')).toBeNull();

      c.abrirImagenAmpliada({ ...recursos[0], titulo: '' } as never);
      fixture.detectChanges();
      expect(c.imagenAmpliadaTitulo).toBe('Vista ampliada');
      (el.querySelector('.modal-overlay') as HTMLElement).click();
      expect(c.imagenAmpliadaUrl).toBeNull();
    });

    it('abrirVistaPrevia ignora los tipos que no son imagen ni panorámica; con Enter también abre', () => {
      const { fixture, c, el } = crear();
      c.abrirVistaPrevia(recursos[1] as never);
      c.abrirImagenAmpliada(recursos[1] as never);
      expect(c.imagenAmpliadaUrl).toBeNull();
      expect(c.mostrarModal360).toBe(false);

      el.querySelectorAll('.media-preview')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(c.imagenAmpliadaUrl).toBe('https://x/f.jpg');
    });

    it('si la imagen falla pone una de respaldo una sola vez', () => {
      const { el } = crear();
      const img = el.querySelector('.media-card img') as HTMLImageElement;
      img.dispatchEvent(new Event('error'));
      const respaldo = img.src;
      expect(respaldo).toContain('data:image/svg+xml');
      img.dispatchEvent(new Event('error'));
      expect(img.src).toBe(respaldo);
    });
  });

  describe('visor 360', () => {
    it('abre el visor con la panorámica, y al cerrar lo destruye', () => {
      vi.useFakeTimers();
      const { fixture, c, el } = crear();
      (el.querySelectorAll('.media-preview')[3] as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-360-card h2')?.textContent).toContain('Vista Panorámica 360°');

      vi.advanceTimersByTime(100);
      expect(visor.opciones.length).toBe(1);
      expect((visor.opciones[0] as { panorama: string }).panorama).toBe('https://x/p.jpg');

      c.cerrarModal360();
      fixture.detectChanges();
      expect(visor.destroy).toHaveBeenCalledTimes(1);
      expect(c.mostrarModal360).toBe(false);
      expect(el.querySelector('.modal-360-card')).toBeNull();
      c.cerrarModal360();
      expect(visor.destroy).toHaveBeenCalledTimes(1);
    });

    it('si ya había un visor lo destruye antes de crear el nuevo, y al destruir el componente también', () => {
      vi.useFakeTimers();
      const { fixture, c } = crear();
      c.abrirVisor360(recursos[3] as never);
      fixture.detectChanges();
      vi.advanceTimersByTime(100);
      c.abrirVisor360({ ...recursos[3], titulo: 'Sala' } as never);
      fixture.detectChanges();
      vi.advanceTimersByTime(100);
      expect(visor.opciones.length).toBe(2);
      expect(visor.destroy).toHaveBeenCalledTimes(1);

      fixture.destroy();
      expect(visor.destroy).toHaveBeenCalledTimes(2);
    });

    it('ignora recursos que no son panorámicas y no falla si el contenedor no existe', () => {
      vi.useFakeTimers();
      const { c } = crear();
      c.abrirVisor360(recursos[0] as never);
      expect(c.mostrarModal360).toBe(false);

      c.abrirVisor360(recursos[3] as never);
      vi.advanceTimersByTime(100);
      expect(visor.opciones.length).toBe(0);
    });

    it('al destruir el componente sin visor no falla', () => {
      const { fixture } = crear();
      fixture.destroy();
      expect(visor.destroy).not.toHaveBeenCalled();
    });
  });

  describe('modal crear y editar', () => {
    it('"Subir Archivo" abre el formulario limpio y el botón Guardar está deshabilitado hasta completarlo', async () => {
      const { fixture, c, el } = crear();
      (el.querySelector('.btn-nuevo') as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h2')?.textContent).toContain('Subir Nuevo Archivo');
      expect(c.formData.tipo).toBe('IMAGEN');
      expect((el.querySelector('.btn-guardar') as HTMLButtonElement).disabled).toBe(true);
      expect(el.querySelector('.file-nombre')?.textContent).toContain('Ningún archivo seleccionado');

      (el.querySelector('.btn-cancelar') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-card form')).toBeNull();
    });

    it('editar carga los datos del recurso y detecta el padre (proyecto, lote, amenidad, etapa, tipología)', () => {
      const { c } = crear();
      c.editarMultimedia(recursos[1] as never);
      expect(c.tipoPadre).toBe('lote');
      expect(c.editandoId).toBe(2);
      c.editarMultimedia(recursos[2] as never);
      expect(c.tipoPadre).toBe('zonaComun');
      c.editarMultimedia(recursos[4] as never);
      expect(c.tipoPadre).toBe('etapa');
      c.editarMultimedia(recursos[3] as never);
      expect(c.tipoPadre).toBe('casaModelo');
      c.editarMultimedia(recursos[0] as never);
      expect(c.tipoPadre).toBe('proyecto');
      expect(c.formData.titulo).toBe('Fachada');

      c.editarMultimedia({ tipo: 'PDF', url: 'u', portada: false, publicado: true, activo: true } as never);
      expect(c.editandoId).toBeNull();
      expect(c.formData.orden).toBe(1);
      expect(c.formData.titulo).toBe('');
      expect(c.nombreArchivoSeleccionado).toBe('');
    });

    it('editar y guardar envía un PUT, avisa y recarga la lista', async () => {
      const { fixture, c, el } = crear();
      (el.querySelectorAll('.btn-icon')[0] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector('.modal-header h2')?.textContent).toContain('Editar Multimedia');
      expect((el.querySelector('.btn-guardar') as HTMLButtonElement).textContent).toContain('Actualizar');

      c.guardarMultimedia();
      expect(c.guardando).toBe(true);
      const req = http.expectOne(`${MULTIMEDIA}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.titulo).toBe('Fachada');
      req.flush({});
      expect(avisos().some((a) => a.message === 'Multimedia guardada exitosamente')).toBe(true);
      expect(c.mostrarModal).toBe(false);
      http.expectOne(MULTIMEDIA).flush([]);
      expect(c.listaMultimedia).toEqual([]);
    });

    it('crear envía un POST; si falla muestra el mensaje del servidor o uno genérico', () => {
      const { c } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.abrirModalCrear();
      c.formData.url = 'https://x/n.jpg';
      c.guardarMultimedia();
      const req = http.expectOne(MULTIMEDIA);
      expect(req.request.method).toBe('POST');
      req.flush({ mensaje: 'URL repetida' }, { status: 400, statusText: 'Bad' });
      expect(avisos().some((a) => a.message === 'URL repetida')).toBe(true);
      expect(c.guardando).toBe(false);
      expect(c.mostrarModal).toBe(true);

      c.guardarMultimedia();
      http.expectOne(MULTIMEDIA).flush(null, { status: 500, statusText: 'Error' });
      expect(avisos().some((a) => a.message === 'Error al guardar archivo multimedia')).toBe(true);
      expect(consola).toHaveBeenCalledTimes(2);
    });
  });

  describe('padres en cascada', () => {
    it('al cambiar el tipo de padre se reinician los ids y las listas dependientes', () => {
      const { c } = crear();
      c.formData.proyectoId = 1;
      c.formData.etapaId = 2;
      c.proyectoReferenciaId = 1;
      c.zonasComunesDisponibles = [{ id: 1 } as never];
      c.onCambioTipoPadre();
      expect(c.formData.proyectoId).toBeNull();
      expect(c.formData.etapaId).toBeNull();
      expect(c.proyectoReferenciaId).toBeNull();
      expect(c.zonasComunesDisponibles).toEqual([]);
    });

    it('sin proyecto de referencia vacía las listas y no pide nada', () => {
      const { c } = crear();
      c.etapasDisponibles = [{ id: 1 } as never];
      c.proyectoReferenciaId = null;
      c.onCambioProyectoReferencia();
      expect(c.etapasDisponibles).toEqual([]);
    });

    it('amenidad, etapa y tipología cargan sus opciones del proyecto elegido', () => {
      const { c } = crear();
      c.proyectoReferenciaId = 1;

      c.tipoPadre = 'zonaComun';
      c.onCambioProyectoReferencia();
      http.expectOne(`${environment.apiUrl}/zonas-comunes/proyecto/1`).flush([{ id: 9, nombre: 'Piscina' }]);
      expect(c.zonasComunesDisponibles.length).toBe(1);

      c.tipoPadre = 'etapa';
      c.onCambioProyectoReferencia();
      http.expectOne(`${environment.apiUrl}/etapas/proyecto/1`).flush([{ id: 8, nombre: 'E1' }]);
      expect(c.etapasDisponibles.length).toBe(1);

      c.tipoPadre = 'casaModelo';
      c.onCambioProyectoReferencia();
      http.expectOne(`${environment.apiUrl}/casas-modelo/proyecto/1`).flush([{ id: 7, nombre: 'Samán' }]);
      expect(c.casasModelosDisponibles.length).toBe(1);

      c.tipoPadre = 'lote';
      c.onCambioProyectoReferencia();
    });

    it('si falla la carga de las opciones avisa según el tipo de padre', () => {
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.proyectoReferenciaId = 1;

      c.tipoPadre = 'zonaComun';
      c.onCambioProyectoReferencia();
      http.expectOne(`${environment.apiUrl}/zonas-comunes/proyecto/1`).flush(null, { status: 500, statusText: 'E' });
      c.tipoPadre = 'etapa';
      c.onCambioProyectoReferencia();
      http.expectOne(`${environment.apiUrl}/etapas/proyecto/1`).flush(null, { status: 500, statusText: 'E' });
      c.tipoPadre = 'casaModelo';
      c.onCambioProyectoReferencia();
      http.expectOne(`${environment.apiUrl}/casas-modelo/proyecto/1`).flush(null, { status: 500, statusText: 'E' });

      const mensajes = avisos().map((a) => a.message);
      expect(mensajes).toContain('Error cargando amenidades');
      expect(mensajes).toContain('Error cargando etapas');
      expect(mensajes).toContain('Error cargando casas modelo');
    });

    it('el formulario muestra el selector que corresponde a cada padre', async () => {
      const { fixture, c, el } = crear();
      c.abrirModalCrear();
      fixture.detectChanges();
      expect(el.querySelector('#proyectoId')).not.toBeNull();
      expect(el.querySelectorAll('#proyectoId option').length).toBe(3);

      const cambiar = (v: string) => {
        c.tipoPadre = v as never;
        fixture.detectChanges();
      };
      cambiar('lote');
      expect(el.querySelector('#loteId')).not.toBeNull();
      cambiar('zonaComun');
      expect(el.querySelector('#zonaComunId')).not.toBeNull();
      expect(el.querySelector('#multimedia-campo-3')).not.toBeNull();
      cambiar('casaModelo');
      expect(el.querySelector('#casaModeloId')).not.toBeNull();
      cambiar('etapa');
      expect(el.querySelector('#etapaId')).not.toBeNull();
      expect(el.querySelector('#proyectoId')).toBeNull();
    });
  });

  describe('subida de archivo', () => {
    function evento(archivo: File | null) {
      const input = { files: archivo ? [archivo] : [], value: 'c:\\x' } as unknown as HTMLInputElement;
      return { evento: { target: input } as unknown as Event, input };
    }

    it('sin archivo no hace nada', () => {
      const { c } = crear();
      const subir = vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo');
      c.onArchivoSeleccionado(evento(null).evento);
      expect(subir).not.toHaveBeenCalled();
      expect(c.subiendoArchivo).toBe(false);
    });

    it('sube el archivo y guarda url, nombre, tipo y tamaño', () => {
      const { c } = crear();
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(of({ url: 'https://c/a.png', resourceType: 'image' }) as never);
      const archivo = new File(['abc'], 'a.png', { type: 'image/png' });
      const { evento: ev, input } = evento(archivo);
      c.onArchivoSeleccionado(ev);

      expect(c.formData.url).toBe('https://c/a.png');
      expect(c.formData.nombreArchivo).toBe('a.png');
      expect(c.formData.mimeType).toBe('image/png');
      expect(c.formData.tamanoBytes).toBe(3);
      expect(c.subiendoArchivo).toBe(false);
      expect(input.value).toBe('');
    });

    it('si la subida falla avisa, muestra el error y limpia el nombre', () => {
      const { fixture, c, el } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(throwError(() => new Error('x')));
      c.abrirModalCrear();
      c.onArchivoSeleccionado(evento(new File(['a'], 'a.png')).evento);
      fixture.detectChanges();

      expect(c.errorArchivo).toContain('No se pudo subir');
      expect(c.nombreArchivoSeleccionado).toBe('');
      expect(el.querySelector('.error-texto')?.textContent).toContain('No se pudo subir');
      expect(avisos().some((a) => a.message === 'No se pudo subir el archivo a Cloudinary')).toBe(true);
    });

    it('la vista previa cambia según el tipo y "Quitar" borra el archivo', () => {
      const { fixture, c, el } = crear();
      c.abrirModalCrear();
      c.formData.url = 'https://c/a.png';
      fixture.detectChanges();
      expect(el.querySelector('.archivo-preview img')).not.toBeNull();

      c.formData.tipo = 'VIDEO';
      fixture.detectChanges();
      expect(el.querySelector('.archivo-preview video')).not.toBeNull();

      c.formData.tipo = 'PDF';
      c.nombreArchivoSeleccionado = 'doc.pdf';
      fixture.detectChanges();
      expect(el.querySelector('.preview-file')?.textContent).toContain('doc.pdf');

      (el.querySelector('.btn-quitar-archivo') as HTMLElement).click();
      fixture.detectChanges();
      expect(c.formData.url).toBe('');
      expect(c.formData.tamanoBytes).toBeUndefined();
      expect(el.querySelector('.archivo-preview')).toBeNull();
    });
  });

  describe('eliminar', () => {
    it('al confirmar elimina el recurso, avisa y recarga', async () => {
      const { c } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.eliminarMultimedia(1);
      expect(dialogo.config().message).toContain('Fachada');
      dialogo.confirm();
      await p;
      const req = http.expectOne(`${MULTIMEDIA}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(avisos().some((a) => a.message === 'Archivo multimedia eliminado')).toBe(true);
      http.expectOne(MULTIMEDIA).flush([]);
    });

    it('si se cancela no pide nada; con id desconocido usa el texto genérico', async () => {
      const { c } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.eliminarMultimedia(999);
      expect(dialogo.config().message).toContain('este archivo');
      dialogo.cancel();
      await p;
      await esperar();
      http.expectNone(`${MULTIMEDIA}/999`);
    });

    it('si el servidor falla avisa con un error', async () => {
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.eliminarMultimedia(2);
      dialogo.confirm();
      await p;
      http.expectOne(`${MULTIMEDIA}/2`).flush(null, { status: 500, statusText: 'E' });
      expect(avisos().some((a) => a.message === 'Error al eliminar el archivo multimedia')).toBe(true);
    });
  });
});
