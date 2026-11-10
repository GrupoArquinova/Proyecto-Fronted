import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BloqueCasasComponent } from './bloque-casas.component';
import { AsistenteProyectoService } from '../../asistente-proyecto.service';
import { ArchivosTipologiaComponent } from '../../../../../shared/components/archivos-tipologia/archivos-tipologia.component';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { CasaModelo } from '../../../../../core/models/casa-modelo.models';
import { environment } from '../../../../../../environments/environment';

const CASAS = `${environment.apiUrl}/casas-modelo`;
const MULTIMEDIA = `${environment.apiUrl}/multimedia`;

describe('BloqueCasasComponent', () => {
  let http: HttpTestingController;

  function crear(casas: Partial<CasaModelo>[] = [], conProyecto = true) {
    TestBed.configureTestingModule({
      imports: [BloqueCasasComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (conProyecto) asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    asistente.casas.set(casas as CasaModelo[]);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BloqueCasasComponent);
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
    const archivos = () => fixture.debugElement.query(By.directive(ArchivosTipologiaComponent)).componentInstance as ArchivosTipologiaComponent;
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, escribir, enviar, archivos };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();
  const confirmar = async (acepta: boolean) => {
    const dialogo = TestBed.inject(ConfirmDialogService);
    if (acepta) dialogo.confirm(); else dialogo.cancel();
    await new Promise(r => setTimeout(r, 0));
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin tipologías muestra el mensaje vacío', () => {
    const { el } = crear();

    expect(el.querySelector('.vacio')!.textContent).toContain('Sin tipologías');
  });

  it('exige el nombre: sin él no llama al servidor y marca el campo como inválido', () => {
    const { enviar, el, componente } = crear();

    enviar();

    http.expectNone(CASAS);
    expect(componente.form.controls.nombre.touched).toBe(true);
    expect(el.querySelector('[formControlName="nombre"]')!.classList.contains('invalido')).toBe(true);
  });

  it('valida que área, habitaciones y baños sean al menos 1', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'Casa Azul');
    escribir('area', '0');
    enviar();

    http.expectNone(CASAS);
    expect(componente.form.controls.area.invalid).toBe(true);
  });

  it('sin proyecto creado no guarda', () => {
    const { escribir, enviar } = crear([], false);

    escribir('nombre', 'Casa Azul');
    enviar();

    http.expectNone(CASAS);
  });

  it('crea la tipología con todos sus datos y, sin archivos, no toca multimedia', () => {
    const { escribir, enviar, asistente, componente, refrescar, el } = crear();

    escribir('nombre', '  Casa Azul ');
    escribir('area', '128.5');
    escribir('habitaciones', '3');
    escribir('banos', '2');
    escribir('descripcion', ' Dos niveles ');
    escribir('tourVirtualUrl', ' https://tour.test/1 ');
    enviar();

    const peticion = http.expectOne(CASAS);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      proyectoId: 6, nombre: 'Casa Azul', descripcion: 'Dos niveles', areaConstruidaM2: 128.5, numeroHabitaciones: 3,
      numeroBanos: 2, tourVirtualUrl: 'https://tour.test/1', publicado: true, activo: true
    });
    expect(el.querySelector('form button[type=submit]')!.textContent).toContain('Agregando...');
    peticion.flush({ id: 12, ...peticion.request.body });
    refrescar();

    http.expectNone(MULTIMEDIA);
    expect(asistente.casas().map(c => c.id)).toEqual([12]);
    expect(componente.guardando()).toBe(false);
    expect(componente.form.controls.nombre.value).toBe('');
    expect(el.querySelector('.lista li strong')!.textContent).toBe('Casa Azul');
    expect(el.querySelector('.lista .sub')!.textContent).toContain('128.5 m² · 3 hab. · 2 baños');
  });

  it('los campos opcionales vacíos se envían como undefined', () => {
    const { escribir, enviar } = crear();

    escribir('nombre', 'Casa Mínima');
    enviar();

    const cuerpo = http.expectOne(CASAS).request.body;
    expect(cuerpo.descripcion).toBeUndefined();
    expect(cuerpo.areaConstruidaM2).toBeUndefined();
    expect(cuerpo.tourVirtualUrl).toBeUndefined();
  });

  it('sube los renders y planos elegidos antes de guardar y los asocia a la tipología creada', () => {
    const { escribir, enviar, archivos, asistente, componente, refrescar } = crear();

    escribir('nombre', 'Casa Azul');
    archivos().imagenes.set([{ url: 'https://cdn.test/r1.jpg', nombre: 'r1.jpg' }, { url: 'https://cdn.test/r2.jpg', nombre: 'r2.jpg' }]);
    archivos().planos.set([{ url: 'https://cdn.test/p1.pdf', nombre: 'planta.pdf' }]);
    refrescar();
    expect(componente.imagenes().length).toBe(2);
    expect(componente.planos().length).toBe(1);
    enviar();

    http.expectOne(CASAS).flush({ id: 12, proyectoId: 6, nombre: 'Casa Azul' });
    const cuerpos: Record<string, unknown>[] = [];
    for (let i = 0; i < 3; i++) {
      const peticion = http.expectOne(MULTIMEDIA);
      cuerpos.push(peticion.request.body);
      peticion.flush({ id: 100 + i });
    }
    refrescar();

    expect(cuerpos.map(c => [c['tipo'], c['orden'], c['portada']])).toEqual([['IMAGEN', 1, true], ['IMAGEN', 2, false], ['PLANO', 1, false]]);
    expect(cuerpos.every(c => c['casaModeloId'] === 12)).toBe(true);
    expect(componente.imagenes()).toEqual([]);
    expect(componente.planos()).toEqual([]);
    expect(componente.guardando()).toBe(false);
    expect(avisos().length).toBe(0);
    expect(asistente.casas().length).toBe(1);
  });

  it('si algún archivo no se puede asociar, avisa cuántos fallaron', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'Casa Azul');
    componente.imagenes.set([{ url: 'https://cdn.test/r1.jpg', nombre: 'r1.jpg' }, { url: 'https://cdn.test/r2.jpg', nombre: 'r2.jpg' }]);
    enviar();
    http.expectOne(CASAS).flush({ id: 12, proyectoId: 6, nombre: 'Casa Azul' });
    http.expectOne(MULTIMEDIA).flush(null, { status: 500, statusText: 'Error' });
    http.expectOne(MULTIMEDIA).flush({ id: 101 });

    expect(avisos()[0].message).toContain('1 archivo(s) no se pudieron asociar');
    expect(componente.guardando()).toBe(false);
  });

  it('si el servidor devuelve la tipología sin id, no intenta asociar archivos', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'Casa Azul');
    componente.imagenes.set([{ url: 'https://cdn.test/r1.jpg', nombre: 'r1.jpg' }]);
    enviar();
    http.expectOne(CASAS).flush({ proyectoId: 6, nombre: 'Casa Azul' });

    http.expectNone(MULTIMEDIA);
    expect(componente.guardando()).toBe(false);
  });

  it('un 409 avisa que ya hay una tipología con ese nombre', () => {
    const { escribir, enviar, el, refrescar } = crear();

    escribir('nombre', 'Casa Azul');
    enviar();
    http.expectOne(CASAS).flush(null, { status: 409, statusText: 'Conflict' });
    refrescar();

    expect(el.querySelector('.error')!.textContent).toContain('Ya hay una tipología con ese nombre');
    expect(avisos().length).toBe(0);
  });

  it('otro error muestra un aviso y conserva lo escrito', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'Casa Azul');
    enviar();
    http.expectOne(CASAS).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0].message).toContain('No se pudo crear la tipología');
    expect(componente.guardando()).toBe(false);
    expect(componente.form.controls.nombre.value).toBe('Casa Azul');
  });

  it('muestra las tipologías existentes con solo los datos que tienen', () => {
    const { el } = crear([
      { id: 1, proyectoId: 6, nombre: 'Casa Azul', areaConstruidaM2: 90, numeroHabitaciones: 2, numeroBanos: 1 },
      { id: 2, proyectoId: 6, nombre: 'Casa Roja' }
    ]);

    const subs = Array.from(el.querySelectorAll('.lista .sub')).map(s => s.textContent!.replace(/\s+/g, ' ').trim());
    expect(subs).toEqual(['90 m² · 2 hab. · 1 baños', '']);
  });

  it('eliminar pide confirmación y quita la tipología; cancelar o un fallo la conservan', async () => {
    const { el, asistente, refrescar } = crear([{ id: 1, proyectoId: 6, nombre: 'Casa Azul' }]);
    const quitar = () => (el.querySelector('.quitar') as HTMLButtonElement).click();

    quitar();
    await confirmar(false);
    http.expectNone(`${CASAS}/1`);

    quitar();
    await confirmar(true);
    http.expectOne(`${CASAS}/1`).flush(null, { status: 500, statusText: 'Error' });
    expect(asistente.casas().length).toBe(1);
    expect(avisos()[0].message).toContain('No se pudo eliminar la tipología');

    quitar();
    await confirmar(true);
    const peticion = http.expectOne(`${CASAS}/1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
    refrescar();
    expect(asistente.casas()).toEqual([]);
  });

  it('una tipología sin id no se puede eliminar', async () => {
    const { componente } = crear();

    await componente.eliminar({ proyectoId: 6, nombre: 'Sin id' } as CasaModelo);

    expect(TestBed.inject(ConfirmDialogService).isOpen()).toBe(false);
  });
});
