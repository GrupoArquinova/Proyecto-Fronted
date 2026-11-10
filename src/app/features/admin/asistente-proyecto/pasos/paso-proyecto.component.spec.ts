import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasoProyectoComponent } from './paso-proyecto.component';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { SubidaArchivoComponent } from '../../../../shared/components/subida-archivo/subida-archivo.component';
import { ToastService } from '../../../../core/services/toast.service';
import { Proyecto } from '../../../../core/models/proyecto.models';
import { environment } from '../../../../../environments/environment';

const PROYECTOS = `${environment.apiUrl}/proyectos`;

describe('PasoProyectoComponent', () => {
  let http: HttpTestingController;

  function crear(existente?: Proyecto) {
    TestBed.configureTestingModule({
      imports: [PasoProyectoComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (existente) asistente.fijarProyecto(existente);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PasoProyectoComponent);
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
      campo.dispatchEvent(new Event('change'));
    };
    const enviar = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const subida = () => fixture.debugElement.query(By.directive(SubidaArchivoComponent)).componentInstance as SubidaArchivoComponent;
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, escribir, enviar, subida };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('un proyecto nuevo arranca vacío, con valores por defecto y el texto "se crea al continuar"', () => {
    const { componente, el } = crear();

    expect(componente.form.getRawValue()).toMatchObject({
      nombre: '', slug: '', estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', tipoProyecto: '', destacado: false
    });
    expect(el.querySelector('.acciones .ayuda')!.textContent).toContain('El proyecto se crea al continuar');
  });

  it('al escribir el nombre genera el slug sin tildes ni símbolos', () => {
    const { escribir, componente } = crear();

    escribir('nombre', 'Condominio Campestre Los Álamos');

    expect(componente.form.controls.slug.value).toBe('condominio-campestre-los-alamos');
  });

  it('si el slug se edita a mano, deja de seguir al nombre', () => {
    const { escribir, componente } = crear();

    escribir('nombre', 'Los Andes');
    escribir('slug', 'mi-slug');
    escribir('nombre', 'Otro nombre distinto');

    expect(componente.slugManual).toBe(true);
    expect(componente.form.controls.slug.value).toBe('mi-slug');
  });

  it('con datos inválidos muestra los errores y no llama al servidor', () => {
    const { enviar, el, componente } = crear();

    enviar();

    http.expectNone(PROYECTOS);
    expect(componente.form.touched).toBe(true);
    expect(el.textContent).toContain('Escribe un nombre de al menos 3 letras.');
    expect(el.textContent).toContain('Usa solo minúsculas, números y guiones.');
  });

  it('un slug con mayúsculas o espacios no pasa la validación', () => {
    const { escribir, enviar, el } = crear();

    escribir('nombre', 'Los Andes');
    escribir('slug', 'Slug Malo');
    enviar();

    http.expectNone(PROYECTOS);
    expect(el.textContent).toContain('Usa solo minúsculas, números y guiones.');
  });

  it('un nombre de dos letras es inválido', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'AB');
    enviar();

    http.expectNone(PROYECTOS);
    expect(componente.invalido('nombre')).toBe(true);
  });

  it('crea el proyecto, lo fija en el asistente, guarda el borrador y pasa al paso 2', () => {
    const { escribir, enviar, asistente, el, subida, refrescar } = crear();

    escribir('nombre', 'Los Andes');
    escribir('descripcion', '  Proyecto campestre  ');
    escribir('participacion', '  Diseño  ');
    (el.querySelector('[formControlName="destacado"]') as HTMLInputElement).click();
    subida().url.set('https://cdn.test/portada.jpg');
    refrescar();
    enviar();

    const peticion = http.expectOne(PROYECTOS);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      empresaId: 1, nombre: 'Los Andes', slug: 'los-andes', descripcion: 'Proyecto campestre',
      estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', tipoProyecto: null, participacion: 'Diseño',
      destacado: true, publicado: false, imagenUrl: 'https://cdn.test/portada.jpg', fechaLanzamiento: undefined
    });
    expect(el.querySelector('button[type=submit]')!.textContent).toContain('Guardando...');
    peticion.flush({ id: 11, empresaId: 1, nombre: 'Los Andes', slug: 'los-andes' });

    expect(asistente.proyectoId()).toBe(11);
    expect(asistente.paso()).toBe(2);
    expect(JSON.parse(localStorage.getItem('asistente_proyecto_borrador')!)).toEqual({ proyectoId: 11, paso: 2 });
  });

  it('envía null en el tipo de proyecto cuando está sin definir y el elegido cuando lo hay', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'Los Andes');
    componente.form.controls.tipoProyecto.setValue('RURAL');
    componente.form.controls.fechaLanzamiento.setValue('2026-05-01');
    enviar();

    const cuerpo = http.expectOne(PROYECTOS).request.body;
    expect(cuerpo.tipoProyecto).toBe('RURAL');
    expect(cuerpo.fechaLanzamiento).toBe('2026-05-01');
  });

  it('un 409 marca el slug como repetido y avisa; al tocar el slug el aviso desaparece', () => {
    const { escribir, enviar, el, refrescar, componente } = crear();

    escribir('nombre', 'Los Andes');
    enviar();
    http.expectOne(PROYECTOS).flush(null, { status: 409, statusText: 'Conflict' });
    refrescar();

    expect(componente.slugRepetido()).toBe(true);
    expect(el.textContent).toContain('Ya existe un proyecto con esta dirección');
    expect(avisos()[0].message).toContain('Ya existe un proyecto con esa dirección web');

    escribir('slug', 'los-andes-2');
    refrescar();
    expect(componente.slugRepetido()).toBe(false);
  });

  it('cualquier otro error muestra un aviso genérico y deja volver a intentar', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { escribir, enviar, componente, asistente } = crear();

    escribir('nombre', 'Los Andes');
    enviar();
    http.expectOne(PROYECTOS).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0].message).toContain('No se pudo guardar el proyecto');
    expect(consola).toHaveBeenCalled();
    expect(componente.guardando()).toBe(false);
    expect(componente.slugRepetido()).toBe(false);
    expect(asistente.tieneProyecto()).toBe(false);
  });

  it('retoma un borrador: rellena el formulario, la portada y actualiza con PUT conservando "publicado"', () => {
    const existente: Proyecto = {
      id: 4, empresaId: 1, nombre: 'Villas', slug: 'villas', descripcion: 'Desc', estadoProyecto: 'EN_CONSTRUCCION',
      tipoRegistro: 'PORTAFOLIO', tipoProyecto: 'TURISTICO', participacion: 'Gestión', destacado: true,
      fechaLanzamiento: '2026-01-10', imagenUrl: 'https://cdn.test/p.jpg', publicado: true
    };
    const { componente, enviar, el, subida, asistente } = crear(existente);

    expect(componente.form.getRawValue()).toMatchObject({
      nombre: 'Villas', slug: 'villas', estadoProyecto: 'EN_CONSTRUCCION', tipoRegistro: 'PORTAFOLIO',
      tipoProyecto: 'TURISTICO', destacado: true, fechaLanzamiento: '2026-01-10'
    });
    expect(subida().url()).toBe('https://cdn.test/p.jpg');
    expect(componente.slugManual).toBe(true);
    expect(el.querySelector('.acciones .ayuda')!.textContent).toContain('Proyecto creado');

    enviar();
    const peticion = http.expectOne(`${PROYECTOS}/4`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body.publicado).toBe(true);
    peticion.flush({ ...existente, nombre: 'Villas' });
    expect(asistente.paso()).toBe(2);
  });

  it('un borrador con datos mínimos usa los valores por defecto para lo que falta', () => {
    const { componente, subida } = crear({ id: 4, empresaId: 1, nombre: 'Villas' });

    expect(componente.form.getRawValue()).toMatchObject({
      slug: '', descripcion: '', estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', tipoProyecto: '',
      participacion: '', destacado: false, fechaLanzamiento: ''
    });
    expect(subida().url()).toBe('');
  });
});
