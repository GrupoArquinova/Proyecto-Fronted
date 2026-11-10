import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasoEtapasComponent } from './paso-etapas.component';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';

const ETAPAS = `${environment.apiUrl}/etapas`;

describe('PasoEtapasComponent', () => {
  let http: HttpTestingController;

  function crear(etapas: { id: number; nombre: string; orden: number }[] = [], conProyecto = true) {
    TestBed.configureTestingModule({
      imports: [PasoEtapasComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (conProyecto) asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    asistente.etapas.set(etapas.map(e => ({ ...e, proyectoId: 6 })) as never);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PasoEtapasComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const escribir = (selector: string, valor: string) => {
      const campo = el.querySelector(selector) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    const enviar = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, escribir, enviar };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin etapas muestra el mensaje vacío, el orden inicial 1 y deshabilita Continuar', () => {
    const { el } = crear();

    expect(el.querySelector('.vacia')!.textContent).toContain('Todavía no hay etapas');
    expect((el.querySelector('input[type=number]') as HTMLInputElement).value).toBe('1');
    const botones = Array.from(el.querySelectorAll('.acciones button')) as HTMLButtonElement[];
    expect(botones.find(b => b.textContent!.includes('Continuar'))!.disabled).toBe(true);
  });

  it('propone como orden el siguiente al mayor que ya existe', () => {
    const { el } = crear([{ id: 1, nombre: 'Etapa 1', orden: 1 }, { id: 2, nombre: 'Etapa 2', orden: 4 }]);

    expect((el.querySelector('input[type=number]') as HTMLInputElement).value).toBe('5');
    expect(el.querySelectorAll('.lista li').length).toBe(2);
  });

  it('no guarda si falta el nombre: lo marca como inválido y no llama al servidor', () => {
    const { el, enviar, componente } = crear();

    enviar();

    http.expectNone(ETAPAS);
    expect(componente.form.controls.nombre.touched).toBe(true);
    expect(el.querySelector('input[type=text]')!.classList.contains('invalido')).toBe(true);
  });

  it('un nombre de solo espacios tampoco se guarda', () => {
    const { escribir, enviar } = crear();

    escribir('input[type=text]', '   ');
    enviar();

    http.expectNone(ETAPAS);
  });

  it('sin proyecto creado no intenta guardar nada', () => {
    const { escribir, enviar } = crear([], false);

    escribir('input[type=text]', 'Etapa 1');
    enviar();

    http.expectNone(ETAPAS);
  });

  it('crea la etapa con el nombre recortado, la agrega ordenada y prepara el siguiente orden', () => {
    const { el, escribir, enviar, refrescar, asistente } = crear([{ id: 1, nombre: 'Etapa 2', orden: 2 }]);

    escribir('input[type=text]', '  Etapa 1 - El Roble  ');
    (el.querySelector('input[type=number]') as HTMLInputElement).value = '1';
    (el.querySelector('input[type=number]') as HTMLInputElement).dispatchEvent(new Event('input'));
    enviar();

    const peticion = http.expectOne(ETAPAS);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ proyectoId: 6, nombre: 'Etapa 1 - El Roble', orden: 1, activo: true });
    expect(el.querySelector('form button[type=submit]')!.textContent).toContain('Agregando...');
    peticion.flush({ id: 9, proyectoId: 6, nombre: 'Etapa 1 - El Roble', orden: 1 });
    refrescar();

    expect(asistente.etapas().map(e => e.orden)).toEqual([1, 2]);
    const nombres = Array.from(el.querySelectorAll('.lista .nombre')).map(n => n.textContent);
    expect(nombres).toEqual(['Etapa 1 - El Roble', 'Etapa 2']);
    expect((el.querySelector('input[type=text]') as HTMLInputElement).value).toBe('');
    expect((el.querySelector('input[type=number]') as HTMLInputElement).value).toBe('3');
    expect(el.querySelector('form button[type=submit]')!.textContent).toContain('Agregar');
  });

  it('un 409 avisa que el nombre ya existe sin mostrar un error genérico', () => {
    const { el, escribir, enviar, refrescar } = crear();

    escribir('input[type=text]', 'Etapa 1');
    enviar();
    http.expectOne(ETAPAS).flush(null, { status: 409, statusText: 'Conflict' });
    refrescar();

    expect(el.querySelector('.error')!.textContent).toContain('Ya hay una etapa con ese nombre');
    expect(avisos().length).toBe(0);
  });

  it('otro error del servidor muestra un aviso y lo registra en consola', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { escribir, enviar, componente } = crear();

    escribir('input[type=text]', 'Etapa 1');
    enviar();
    http.expectOne(ETAPAS).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0].message).toContain('No se pudo crear la etapa');
    expect(consola).toHaveBeenCalled();
    expect(componente.guardando()).toBe(false);
    expect(componente.duplicada()).toBe(false);
  });

  it('eliminar pide confirmación y, al aceptar, borra la etapa de la lista', async () => {
    const { el, asistente, refrescar } = crear([{ id: 1, nombre: 'Etapa 1', orden: 1 }]);
    const dialogo = TestBed.inject(ConfirmDialogService);

    (el.querySelector('.quitar') as HTMLButtonElement).click();
    expect(dialogo.config().message).toContain('Etapa 1');
    dialogo.confirm();
    await new Promise(r => setTimeout(r, 0));

    const peticion = http.expectOne(`${ETAPAS}/1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
    refrescar();

    expect(asistente.etapas()).toEqual([]);
    expect(el.querySelector('.vacia')).not.toBeNull();
  });

  it('si se cancela la confirmación no se llama al servidor', async () => {
    const { el, asistente } = crear([{ id: 1, nombre: 'Etapa 1', orden: 1 }]);
    const dialogo = TestBed.inject(ConfirmDialogService);

    (el.querySelector('.quitar') as HTMLButtonElement).click();
    dialogo.cancel();
    await new Promise(r => setTimeout(r, 0));

    http.expectNone(`${ETAPAS}/1`);
    expect(asistente.etapas().length).toBe(1);
  });

  it('si el servidor falla al eliminar, la etapa se queda y se avisa', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { el, asistente } = crear([{ id: 1, nombre: 'Etapa 1', orden: 1 }]);
    const dialogo = TestBed.inject(ConfirmDialogService);

    (el.querySelector('.quitar') as HTMLButtonElement).click();
    dialogo.confirm();
    await new Promise(r => setTimeout(r, 0));
    http.expectOne(`${ETAPAS}/1`).flush(null, { status: 500, statusText: 'Error' });

    expect(asistente.etapas().length).toBe(1);
    expect(avisos()[0].message).toContain('No se pudo eliminar la etapa');
    expect(consola).toHaveBeenCalled();
  });

  it('una etapa sin id no se puede eliminar', async () => {
    const { componente } = crear();
    const dialogo = TestBed.inject(ConfirmDialogService);

    await componente.eliminar({ nombre: 'Sin id', orden: 1 } as never);

    expect(dialogo.isOpen()).toBe(false);
  });

  it('Atrás retrocede un paso y Continuar (con etapas) avanza al siguiente', () => {
    const { el, asistente, fixture } = crear([{ id: 1, nombre: 'Etapa 1', orden: 1 }]);
    asistente.paso.set(3);
    const botones = Array.from(el.querySelectorAll('.acciones button')) as HTMLButtonElement[];
    const atras = botones.find(b => b.textContent!.includes('Atrás'))!;
    const continuar = botones.find(b => b.textContent!.includes('Continuar'))!;
    fixture.detectChanges();

    expect(continuar.disabled).toBe(false);
    continuar.click();
    expect(asistente.paso()).toBe(4);
    atras.click();
    expect(asistente.paso()).toBe(3);
  });
});
