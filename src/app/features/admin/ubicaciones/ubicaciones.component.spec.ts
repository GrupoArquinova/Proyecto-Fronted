import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UbicacionesComponent } from './ubicaciones.component';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Ubicacion } from '../../../core/models/ubicacion.models';
import { environment } from '../../../../environments/environment';

const UBICACIONES = `${environment.apiUrl}/ubicaciones`;

const ubicaciones = [
  { id: 1, proyectoId: 1, proyectoNombre: 'El Encanto', ciudad: 'Armenia', departamento: 'Quindío', latitud: 4.5, longitud: -75.6 },
  { id: 2, proyectoId: 2, ciudad: 'Tunja', departamento: 'Boyacá' },
];

describe('UbicacionesComponent', () => {
  let http: HttpTestingController;

  function crear(lista: unknown[] = ubicaciones) {
    TestBed.configureTestingModule({
      imports: [UbicacionesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(UbicacionesComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(UBICACIONES).flush(structuredClone(lista));
    http.expectOne(`${environment.apiUrl}/proyectos`).flush([{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }]);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const avisos = () => TestBed.inject(ToastService).toasts().map((a) => a.message);
  const esperar = () => new Promise((r) => setTimeout(r, 0));
  const eventoArchivo = (archivo: File | null) => {
    const input = { files: archivo ? [archivo] : [], value: 'c:\\x' } as unknown as HTMLInputElement;
    return { evento: { target: input } as unknown as Event, input };
  };

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  describe('lista', () => {
    it('muestra una tarjeta por ubicación con proyecto y ciudad, con texto de respaldo', () => {
      const { el } = crear();
      const tarjetas = el.querySelectorAll('.ubicacion-card');
      expect(tarjetas.length).toBe(2);
      expect(tarjetas[0].querySelector('h3')?.textContent).toBe('El Encanto');
      expect(tarjetas[0].querySelector('.ubicacion-sub')?.textContent).toBe('Armenia, Quindío');
      expect(tarjetas[1].querySelector('h3')?.textContent).toBe('Proyecto Inmobiliario');
    });

    it('si falla la carga de ubicaciones o de proyectos avisa con un error', () => {
      TestBed.configureTestingModule({ imports: [UbicacionesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(UbicacionesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(UBICACIONES).flush(null, { status: 500, statusText: 'E' });
      http.expectOne(`${environment.apiUrl}/proyectos`).flush(null, { status: 500, statusText: 'E' });

      expect(consola).toHaveBeenCalledTimes(2);
      expect(fixture.componentInstance.cargando).toBe(false);
      expect(avisos()).toEqual(expect.arrayContaining(['Error al cargar las ubicaciones', 'Error al cargar los proyectos']));
    });
  });

  describe('editor de botones 360', () => {
    it('"Botones 360°" abre el editor con esa ubicación y se cierra con su X', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { fixture, c, el } = crear();
      (el.querySelectorAll('.card-footer button')[1] as HTMLElement).click();
      fixture.detectChanges();
      await Promise.resolve();
      // El editor pide sus datos al abrirse: se responden vacíos
      const pedidos = http.match(() => true);
      expect(pedidos.length).toBe(6);
      pedidos.forEach((p) => p.flush([]));
      fixture.detectChanges();
      expect(c.editorPuntos()?.id).toBe(1);
      expect(el.querySelector('app-editor-puntos header p')?.textContent).toBe('El Encanto');

      (el.querySelector('app-editor-puntos .cerrar') as HTMLElement).click();
      fixture.detectChanges();
      expect(c.editorPuntos()).toBeNull();
      expect(el.querySelector('app-editor-puntos')).toBeNull();
    });
  });

  describe('crear y editar', () => {
    it('"+ Nueva Ubicación" abre el formulario vacío con Guardar deshabilitado y "Cancelar" lo cierra', async () => {
      const { fixture, c, el } = crear();
      (el.querySelector('.btn-nuevo') as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h3')?.textContent).toBe('Registrar Ubicación');
      expect(c.formData.proyectoId).toBe(0);
      expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
      expect(el.querySelectorAll('#ubicaciones-campo-1 option').length).toBe(3);

      (el.querySelector('.u-13 button[type="button"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
    });

    it('"Ver / Editar" carga una copia de la ubicación y cambia el título; la X cierra', () => {
      const { fixture, c, el } = crear();
      (el.querySelector('.btn-ver-ubicacion') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-header h3')?.textContent).toBe('Editar Ubicación');
      expect(c.formData.ciudad).toBe('Armenia');
      expect(c.formData).not.toBe(c.listaUbicaciones[0]);

      (el.querySelector('.modal-header button') as HTMLElement).click();
      fixture.detectChanges();
      expect(c.mostrarModal).toBe(false);

      c.abrirDetalleUbicacion({ proyectoId: 3, ciudad: 'a', departamento: 'b' });
      expect(c.editandoId).toBeNull();
    });

    it('crea con POST redondeando las coordenadas a 7 decimales, avisa y recarga', () => {
      const { c } = crear();
      c.abrirModalCrear();
      c.formData = { ...c.formData, proyectoId: 1, ciudad: 'Armenia', departamento: 'Quindío', latitud: 4.123456789, longitud: -75.987654321 };
      c.guardarUbicacion();
      expect(c.guardando).toBe(true);
      const req = http.expectOne(UBICACIONES);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.latitud).toBe(4.1234568);
      expect(req.request.body.longitud).toBe(-75.9876543);
      req.flush({});
      expect(avisos()).toContain('Ubicación guardada correctamente');
      expect(c.mostrarModal).toBe(false);
      http.expectOne(UBICACIONES).flush([]);
      expect(c.listaUbicaciones).toEqual([]);
    });

    it('editar guarda con PUT; sin coordenadas las envía vacías', () => {
      const { c } = crear();
      c.abrirDetalleUbicacion({ ...ubicaciones[1] } as Ubicacion);
      c.guardarUbicacion();
      const req = http.expectOne(`${UBICACIONES}/2`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.latitud).toBeUndefined();
      req.flush({});
      http.expectOne(UBICACIONES).flush([]);
    });

    it('si el servidor rechaza avisa con su mensaje, o sin detalle si no lo trae', () => {
      const { c } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.abrirModalCrear();
      c.guardarUbicacion();
      http.expectOne(UBICACIONES).flush({ mensaje: 'Proyecto repetido' }, { status: 400, statusText: 'B' });
      expect(avisos()).toContain('Error al guardar la ubicación: Proyecto repetido');
      expect(c.guardando).toBe(false);
      expect(c.mostrarModal).toBe(true);

      c.guardarUbicacion();
      http.expectOne(UBICACIONES).flush(null, { status: 500, statusText: 'E' });
      expect(avisos()).toContain('Error al guardar la ubicación');
      expect(consola).toHaveBeenCalledTimes(2);
    });

    it('rechaza coordenadas fuera de rango y no envía nada', () => {
      const { c } = crear();
      c.abrirModalCrear();
      c.formData.latitud = 450;
      c.guardarUbicacion();
      expect(avisos().some((m) => m.startsWith('La latitud debe estar entre -90 y 90'))).toBe(true);

      c.formData.latitud = 4.5;
      c.formData.longitud = -7500;
      c.guardarUbicacion();
      expect(avisos().some((m) => m.startsWith('La longitud debe estar entre -180 y 180'))).toBe(true);

      c.formData.longitud = Number.NaN;
      c.guardarUbicacion();
      expect(c.guardando).toBe(false);
      http.expectNone(UBICACIONES);
    });

    it('trata el texto vacío de una coordenada como sin valor', () => {
      const { c } = crear();
      c.abrirModalCrear();
      c.formData.latitud = '' as unknown as number;
      c.guardarUbicacion();
      const req = http.expectOne(UBICACIONES);
      expect(req.request.body.latitud).toBeUndefined();
      req.flush({});
      http.expectOne(UBICACIONES).flush([]);
    });
  });

  describe('subida de imágenes', () => {
    it('sin archivo no hace nada y limpia el input', () => {
      const { c } = crear();
      const subir = vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo');
      const { evento, input } = eventoArchivo(null);
      c.subirImagen('urbanismoUrl', evento);
      expect(subir).not.toHaveBeenCalled();
      expect(input.value).toBe('');
    });

    it('rechaza un archivo que no es imagen con el mensaje de validación', () => {
      const { c } = crear();
      const subir = vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo');
      c.subirImagen('vistaAereaUrl', eventoArchivo(new File(['x'], 'a.pdf', { type: 'application/pdf' })).evento);
      expect(subir).not.toHaveBeenCalled();
      expect(avisos().some((m) => m.includes('Sube imágenes'))).toBe(true);
    });

    it('sube la imagen y deja la URL en el campo elegido', () => {
      const { c } = crear();
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(of({ url: 'https://c/a.jpg', resourceType: 'image' }) as never);
      c.subirImagen('recorrido360Url', eventoArchivo(new File(['x'], 'a.jpg', { type: 'image/jpeg' })).evento);
      expect(c.formData.recorrido360Url).toBe('https://c/a.jpg');
      expect(c.subiendoCampo).toBeNull();
      expect(avisos()).toContain('Imagen subida. Recuerda guardar la ubicación.');
    });

    it('si la subida falla avisa y libera los botones', () => {
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(throwError(() => new Error('x')));
      c.subirImagen('urbanismoUrl', eventoArchivo(new File(['x'], 'a.jpg', { type: 'image/jpeg' })).evento);
      expect(c.subiendoCampo).toBeNull();
      expect(avisos()).toContain('No se pudo subir la imagen. Inténtalo de nuevo.');
    });

    it('mientras sube muestra "Subiendo..." y bloquea los demás campos de archivo', () => {
      const { fixture, c, el } = crear();
      c.abrirModalCrear();
      c.subiendoCampo = 'vistaAereaUrl';
      fixture.detectChanges();
      const etiquetas = Array.from(el.querySelectorAll('.btn-subir')).map((e) => e.textContent?.trim());
      expect(etiquetas).toEqual(['Subir imagen desde mi equipo', 'Subiendo...', 'Subir imagen desde mi equipo']);
      expect(Array.from(el.querySelectorAll('.btn-subir input')).every((i) => (i as HTMLInputElement).disabled)).toBe(true);
    });
  });

  describe('eliminar', () => {
    it('al confirmar elimina, avisa y recarga', async () => {
      const { c } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.eliminarUbicacion(1);
      expect(dialogo.config().message).toContain('El Encanto');
      dialogo.confirm();
      await p;
      const req = http.expectOne(`${UBICACIONES}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(avisos()).toContain('Ubicación eliminada correctamente');
      http.expectOne(UBICACIONES).flush([]);
    });

    it('si se cancela no pide nada (id desconocido usa el texto genérico)', async () => {
      const { c } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.eliminarUbicacion(99);
      expect(dialogo.config().message).toContain('esta ubicación');
      dialogo.cancel();
      await p;
      await esperar();
      http.expectNone(`${UBICACIONES}/99`);
    });

    it('si el servidor falla avisa con un error', async () => {
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.eliminarUbicacion(1);
      dialogo.confirm();
      await p;
      http.expectOne(`${UBICACIONES}/1`).flush(null, { status: 500, statusText: 'E' });
      expect(avisos()).toContain('Error al eliminar la ubicación');
    });
  });
});
