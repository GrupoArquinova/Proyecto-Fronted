import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasoUbicacionComponent } from './paso-ubicacion.component';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { SubidaArchivoComponent } from '../../../../shared/components/subida-archivo/subida-archivo.component';
import { ToastService } from '../../../../core/services/toast.service';
import { Ubicacion } from '../../../../core/models/ubicacion.models';
import { environment } from '../../../../../environments/environment';

const UBICACIONES = `${environment.apiUrl}/ubicaciones`;

describe('PasoUbicacionComponent', () => {
  let http: HttpTestingController;

  function crear(ubicacion?: Ubicacion, conProyecto = true) {
    TestBed.configureTestingModule({
      imports: [PasoUbicacionComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (conProyecto) asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    if (ubicacion) asistente.ubicacion.set(ubicacion);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PasoUbicacionComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const escribir = (nombre: string, valor: string) => {
      const campo = el.querySelector(`[formControlName="${nombre}"]`) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    const enviar = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const subidas = () => fixture.debugElement.queryAll(By.directive(SubidaArchivoComponent)).map(d => d.componentInstance as SubidaArchivoComponent);
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, escribir, enviar, subidas };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('ofrece los cinco campos de subida de recursos de la ubicación', () => {
    const { subidas } = crear();

    expect(subidas().map(s => s.etiqueta())).toEqual([
      'Plano de urbanismo', 'Plano de urbanismo en inglés (opcional)', 'Vista aérea', 'Recorrido 360° (foto panorámica)', 'Video de cómo llegar'
    ]);
  });

  it('exige ciudad y departamento y no guarda sin ellos', () => {
    const { enviar, el } = crear();

    enviar();

    http.expectNone(UBICACIONES);
    expect(el.textContent).toContain('Escribe la ciudad.');
    expect(el.textContent).toContain('Escribe el departamento.');
  });

  it('valida los rangos de latitud (-90 a 90) y longitud (-180 a 180)', () => {
    const { escribir, enviar, el, componente } = crear();

    escribir('ciudad', 'Armenia');
    escribir('departamento', 'Quindío');
    escribir('latitud', '95');
    escribir('longitud', '-200');
    enviar();

    http.expectNone(UBICACIONES);
    expect(componente.invalido('latitud')).toBe(true);
    expect(componente.invalido('longitud')).toBe(true);
    expect(el.textContent).toContain('Debe estar entre -90 y 90.');
    expect(el.textContent).toContain('Debe estar entre -180 y 180.');
  });

  it('sin proyecto creado no guarda', () => {
    const { escribir, enviar } = crear(undefined, false);

    escribir('ciudad', 'Armenia');
    escribir('departamento', 'Quindío');
    enviar();

    http.expectNone(UBICACIONES);
  });

  it('crea la ubicación con POST, deja vacíos como undefined, guarda y pasa al paso 3', () => {
    const { escribir, enviar, subidas, refrescar, asistente } = crear();
    asistente.paso.set(2);

    escribir('ciudad', '  Armenia ');
    escribir('departamento', 'Quindío');
    escribir('direccion', '   ');
    escribir('latitud', '4.53');
    escribir('longitud', '-75.67');
    subidas()[0].url.set('https://cdn.test/urbanismo.pdf');
    subidas()[3].url.set('https://cdn.test/360.jpg');
    refrescar();
    enviar();

    const peticion = http.expectOne(UBICACIONES);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      proyectoId: 6, ciudad: 'Armenia', departamento: 'Quindío', latitud: 4.53, longitud: -75.67,
      urbanismoUrl: 'https://cdn.test/urbanismo.pdf', urbanismoUrlEn: undefined, recorrido360Url: 'https://cdn.test/360.jpg'
    });
    peticion.flush({ id: 3, proyectoId: 6, ciudad: 'Armenia', departamento: 'Quindío' });

    expect(asistente.ubicacion()?.id).toBe(3);
    expect(asistente.paso()).toBe(3);
  });

  it('retoma una ubicación existente: rellena el formulario y los archivos y actualiza con PUT', () => {
    const existente: Ubicacion = {
      id: 8, proyectoId: 6, ciudad: 'Calarcá', departamento: 'Quindío', direccion: 'Km 5', referencias: 'Después del club',
      latitud: 4.5, longitud: -75.6, googleMapsUrl: 'https://maps.test/x', urbanismoUrl: 'https://cdn.test/u.jpg',
      urbanismoUrlEn: 'https://cdn.test/u-en.jpg', vistaAereaUrl: 'https://cdn.test/a.jpg', recorrido360Url: 'https://cdn.test/r.jpg',
      videoComoLlegarUrl: 'https://cdn.test/v.mp4'
    };
    const { componente, subidas, enviar, asistente } = crear(existente);

    expect(componente.form.getRawValue()).toMatchObject({ ciudad: 'Calarcá', direccion: 'Km 5', latitud: 4.5, googleMapsUrl: 'https://maps.test/x' });
    expect(subidas().map(s => s.url())).toEqual([
      'https://cdn.test/u.jpg', 'https://cdn.test/u-en.jpg', 'https://cdn.test/a.jpg', 'https://cdn.test/r.jpg', 'https://cdn.test/v.mp4'
    ]);

    enviar();
    const peticion = http.expectOne(`${UBICACIONES}/8`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body.direccion).toBe('Km 5');
    expect(peticion.request.body.googleMapsUrl).toBe('https://maps.test/x');
    peticion.flush({ ...existente, ciudad: 'Calarcá' });
    expect(asistente.paso()).toBe(2);
  });

  it('una ubicación retomada con campos opcionales ausentes usa valores vacíos', () => {
    const { componente, subidas } = crear({ id: 8, proyectoId: 6, ciudad: 'Calarcá', departamento: 'Quindío' });

    expect(componente.form.getRawValue()).toMatchObject({ direccion: '', referencias: '', latitud: null, longitud: null, googleMapsUrl: '' });
    expect(subidas().every(s => s.url() === '')).toBe(true);
  });

  it('si falla el guardado avisa, lo registra y se queda en el mismo paso', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { escribir, enviar, asistente, componente } = crear();

    escribir('ciudad', 'Armenia');
    escribir('departamento', 'Quindío');
    enviar();
    http.expectOne(UBICACIONES).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0].message).toContain('No se pudo guardar la ubicación');
    expect(consola).toHaveBeenCalled();
    expect(componente.guardando()).toBe(false);
    expect(asistente.paso()).toBe(1);
  });

  it('Atrás retrocede un paso', () => {
    const { el, asistente } = crear();
    asistente.paso.set(2);

    (el.querySelector('button.secundario') as HTMLButtonElement).click();

    expect(asistente.paso()).toBe(1);
  });
});
