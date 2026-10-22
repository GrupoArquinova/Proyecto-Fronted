import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BloqueRecursosComponent } from './bloque-recursos.component';
import { AsistenteProyectoService } from '../../asistente-proyecto.service';
import { SubidaArchivoComponent } from '../../../../../shared/components/subida-archivo/subida-archivo.component';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Multimedia } from '../../../../../core/models/multimedia.models';
import { environment } from '../../../../../../environments/environment';

const MULTIMEDIA = `${environment.apiUrl}/multimedia`;

describe('BloqueRecursosComponent', () => {
  let http: HttpTestingController;

  function crear(recursos: Partial<Multimedia>[] = [], conProyecto = true) {
    TestBed.configureTestingModule({
      imports: [BloqueRecursosComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (conProyecto) asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    asistente.recursos.set(recursos as Multimedia[]);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BloqueRecursosComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const subida = () => fixture.debugElement.query(By.directive(SubidaArchivoComponent)).componentInstance as SubidaArchivoComponent;
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, subida };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin recursos muestra el mensaje vacío y por defecto pide un video', () => {
    const { el, subida, componente } = crear();

    expect(el.querySelector('.vacio')!.textContent).toContain('Todavía no hay recursos');
    expect(componente.tipo()).toBe('VIDEO');
    expect(subida().tipos()).toEqual(['video']);
    expect(subida().etiqueta()).toBe('Subir video del proyecto');
  });

  it('el tipo de archivo admitido cambia según el tipo de recurso elegido', () => {
    const { componente, subida, fixture } = crear();
    const esperado: Record<string, string[]> = {
      VIDEO: ['video'], PDF: ['pdf'], PLANO: ['imagen', 'pdf'], IMAGEN: ['imagen'], BENEFICIOS: ['imagen'],
      RESPALDO: ['imagen'], MAPA: ['imagen'], ZONAS_DESTACADAS: ['imagen'], PANORAMICA_360: ['imagen']
    };

    for (const [tipo, archivos] of Object.entries(esperado)) {
      componente.tipo.set(tipo as never);
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      expect(subida().tipos(), tipo).toEqual(archivos);
    }
    expect(componente.opciones.length).toBe(9);
  });

  it('elegir un tipo en el selector actualiza la señal y la etiqueta de la subida', async () => {
    const { el, componente, subida, fixture } = crear();
    await fixture.whenStable();

    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(componente.tipo()).toBe('PDF');
    expect(subida().etiqueta()).toBe('Subir pdf (brochure, ficha técnica)');
  });

  it('el título se guarda recortado en la señal y vacío se envía como undefined', async () => {
    const { el, componente, subida, fixture } = crear();
    await fixture.whenStable();

    const campo = el.querySelector('input[type=text]') as HTMLInputElement;
    campo.value = '  Video de presentación ';
    campo.dispatchEvent(new Event('input'));
    expect(componente.titulo()).toBe('  Video de presentación ');

    subida().subido.emit({ url: 'https://cdn.test/v.mp4', nombre: 'v.mp4' });
    const peticion = http.expectOne(MULTIMEDIA);
    expect(peticion.request.body.titulo).toBe('Video de presentación');
    peticion.flush({ id: 1, tipo: 'VIDEO', url: 'https://cdn.test/v.mp4', titulo: 'Video de presentación' });

    expect(componente.titulo()).toBe('');
    subida().subido.emit({ url: 'https://cdn.test/v2.mp4', nombre: 'v2.mp4' });
    expect(http.expectOne(MULTIMEDIA).request.body.titulo).toBeUndefined();
  });

  it('un archivo subido se guarda como recurso del proyecto con el siguiente orden', () => {
    const { subida, asistente, refrescar, el } = crear([{ id: 1, tipo: 'PDF', url: 'u', orden: 4 }]);

    subida().subido.emit({ url: 'https://cdn.test/v.mp4', nombre: 'v.mp4' });
    const peticion = http.expectOne(MULTIMEDIA);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      proyectoId: 6, tipo: 'VIDEO', url: 'https://cdn.test/v.mp4', nombreArchivo: 'v.mp4', orden: 5,
      portada: false, publicado: true, activo: true, titulo: undefined
    });
    peticion.flush({ id: 2, tipo: 'VIDEO', url: 'https://cdn.test/v.mp4', nombreArchivo: 'v.mp4' });
    refrescar();

    expect(asistente.recursos().map(r => r.id)).toEqual([1, 2]);
    expect(el.querySelectorAll('.lista li').length).toBe(2);
  });

  it('sin proyecto creado no guarda el recurso', () => {
    const { subida } = crear([], false);

    subida().subido.emit({ url: 'https://cdn.test/v.mp4', nombre: 'v.mp4' });

    http.expectNone(MULTIMEDIA);
  });

  it('si el servidor falla al guardar el recurso avisa que el archivo se subió pero no se guardó', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { subida, asistente } = crear();

    subida().subido.emit({ url: 'https://cdn.test/v.mp4', nombre: 'v.mp4' });
    http.expectOne(MULTIMEDIA).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0].message).toContain('El archivo se subió pero no se pudo guardar');
    expect(consola).toHaveBeenCalled();
    expect(asistente.recursos()).toEqual([]);
  });

  it('la lámina de beneficios es única: la nueva reemplaza y borra a la anterior', () => {
    const { subida, componente, asistente } = crear([
      { id: 1, tipo: 'BENEFICIOS', url: 'vieja', orden: 1 }, { id: 2, tipo: 'VIDEO', url: 'v', orden: 2 }
    ]);

    componente.tipo.set('BENEFICIOS');
    subida().subido.emit({ url: 'https://cdn.test/nueva.jpg', nombre: 'nueva.jpg' });
    http.expectOne(MULTIMEDIA).flush({ id: 3, tipo: 'BENEFICIOS', url: 'https://cdn.test/nueva.jpg' });
    const borrado = http.expectOne(`${MULTIMEDIA}/1`);
    expect(borrado.request.method).toBe('DELETE');
    borrado.flush(null);

    expect(asistente.recursos().map(r => r.id)).toEqual([2, 3]);
  });

  it('un fallo al borrar la lámina anterior se ignora', () => {
    const { subida, componente, asistente } = crear([{ id: 1, tipo: 'BENEFICIOS', url: 'vieja', orden: 1 }]);

    componente.tipo.set('BENEFICIOS');
    subida().subido.emit({ url: 'https://cdn.test/nueva.jpg', nombre: 'nueva.jpg' });
    http.expectOne(MULTIMEDIA).flush({ id: 3, tipo: 'BENEFICIOS', url: 'x' });
    http.expectOne(`${MULTIMEDIA}/1`).flush(null, { status: 500, statusText: 'Error' });

    expect(asistente.recursos().map(r => r.id)).toEqual([3]);
    expect(avisos().length).toBe(0);
  });

  it('otros tipos no reemplazan recursos existentes del mismo tipo', () => {
    const { subida, componente, asistente } = crear([{ id: 1, tipo: 'MAPA', url: 'a', orden: 1 }]);

    componente.tipo.set('MAPA');
    subida().subido.emit({ url: 'https://cdn.test/m2.jpg', nombre: 'm2.jpg' });
    http.expectOne(MULTIMEDIA).flush({ id: 2, tipo: 'MAPA', url: 'b' });

    http.expectNone(`${MULTIMEDIA}/1`);
    expect(asistente.recursos().length).toBe(2);
  });

  it('la lista muestra el tipo legible y el título, el nombre del archivo o "Ver archivo"', () => {
    const { el, componente } = crear([
      { id: 1, tipo: 'VIDEO', url: 'https://x/v.mp4', titulo: 'Presentación', nombreArchivo: 'v.mp4' },
      { id: 2, tipo: 'PDF', url: 'https://x/b.pdf', nombreArchivo: 'brochure.pdf' },
      { id: 3, tipo: 'PLANO', url: 'https://x/p.jpg' }
    ]);

    const filas = Array.from(el.querySelectorAll('.lista li'));
    expect(filas.map(f => f.querySelector('.tipo')!.textContent)).toEqual(['Video del proyecto', 'PDF', 'Plano']);
    expect(filas.map(f => f.querySelector('a')!.textContent)).toEqual(['Presentación', 'brochure.pdf', 'Ver archivo']);
    expect((filas[0].querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe('https://x/v.mp4');
    expect(componente.nombreTipo('MAPA')).toBe('Imagen del mapa de ubicación');
    expect(componente.nombreTipo('OTRO_RARO' as never)).toBe('OTRO_RARO');
  });

  it('quitar un recurso pide confirmación; cancelar y un fallo del servidor lo conservan', async () => {
    const { el, asistente, refrescar } = crear([{ id: 1, tipo: 'VIDEO', url: 'u' }]);
    const dialogo = TestBed.inject(ConfirmDialogService);
    const quitar = () => (el.querySelector('.quitar') as HTMLButtonElement).click();

    quitar();
    dialogo.cancel();
    await new Promise(r => setTimeout(r, 0));
    http.expectNone(`${MULTIMEDIA}/1`);

    quitar();
    dialogo.confirm();
    await new Promise(r => setTimeout(r, 0));
    http.expectOne(`${MULTIMEDIA}/1`).flush(null, { status: 500, statusText: 'Error' });
    expect(asistente.recursos().length).toBe(1);
    expect(avisos()[0].message).toContain('No se pudo quitar el recurso');

    quitar();
    dialogo.confirm();
    await new Promise(r => setTimeout(r, 0));
    const peticion = http.expectOne(`${MULTIMEDIA}/1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
    refrescar();
    expect(asistente.recursos()).toEqual([]);
  });

  it('un recurso sin id no se puede quitar', async () => {
    const { componente } = crear();

    await componente.eliminar({ tipo: 'VIDEO', url: 'u' } as Multimedia);

    expect(TestBed.inject(ConfirmDialogService).isOpen()).toBe(false);
  });
});
