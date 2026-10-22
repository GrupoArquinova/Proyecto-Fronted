import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectorRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { LoginComponent } from './login.component';

@Component({ template: '' })
class PaginaVacia {}

const URL_LOGIN = `${environment.apiUrl}/auth/login`;

function crear() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/resumen', component: PaginaVacia }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

  const escribir = (selector: string, valor: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };
  const enviar = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const boton = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const alerta = () => el.querySelector('.error-alert')?.textContent?.trim() ?? null;
  const refrescar = () => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  return { fixture, el, http, navegar, escribir, enviar, boton, alerta, refrescar };
}

describe('LoginComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('muestra el formulario con correo, contraseña y el enlace para recuperar la contraseña', () => {
    const { el, boton } = crear();

    expect(el.querySelector('h3')?.textContent).toContain('Iniciar sesión');
    expect(el.querySelector('#email')).not.toBeNull();
    expect(el.querySelector('#password')).not.toBeNull();
    expect(el.querySelector('.forgot-password-link')?.getAttribute('href')).toBe('/recuperar-password');
    expect(boton().textContent?.trim()).toBe('Ingresar');
    expect(boton().disabled).toBe(false);
  });

  it('con el formulario vacío no llama al servidor y avisa que falta completar', () => {
    const { enviar, alerta, http } = crear();

    enviar();

    http.expectNone(URL_LOGIN);
    expect(alerta()).toBe('Por favor complete todos los campos correctamente.');
  });

  it('con un correo mal escrito tampoco envía las credenciales', () => {
    const { escribir, enviar, alerta, http } = crear();

    escribir('#email', 'no-es-un-correo');
    escribir('#password', 'Secreta1!');
    enviar();

    http.expectNone(URL_LOGIN);
    expect(alerta()).toContain('complete todos los campos');
  });

  it('el aviso de validación desaparece solo a los 5 segundos', () => {
    vi.useFakeTimers();
    const { enviar, alerta, refrescar } = crear();

    enviar();
    expect(alerta()).not.toBeNull();

    vi.advanceTimersByTime(5000);
    refrescar();

    expect(alerta()).toBeNull();
  });

  it('al salir de la pantalla no queda pendiente el temporizador del aviso', () => {
    vi.useFakeTimers();
    const { enviar, fixture } = crear();
    enviar();
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('un segundo error reinicia el temporizador del aviso', () => {
    vi.useFakeTimers();
    const { enviar, alerta, refrescar } = crear();

    enviar();
    vi.advanceTimersByTime(3000);
    enviar();
    vi.advanceTimersByTime(3000); // pasaron 6 s desde el primero pero solo 3 desde el segundo
    refrescar();
    expect(alerta()).not.toBeNull();

    vi.advanceTimersByTime(2000);
    refrescar();
    expect(alerta()).toBeNull();
  });

  it('con credenciales correctas guarda la sesión y navega al resumen del panel', () => {
    const { escribir, enviar, http, navegar, boton, fixture } = crear();
    escribir('#email', 'admin@arquinova.com');
    escribir('#password', 'Secreta1!');

    enviar();
    const req = http.expectOne(URL_LOGIN);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'admin@arquinova.com', password: 'Secreta1!' });
    // mientras espera, el botón queda bloqueado y lo dice
    expect(boton().disabled).toBe(true);
    expect(boton().textContent?.trim()).toBe('Ingresando...');

    req.flush({ token: 'jwt-prueba', nombre: 'Ana' });
    fixture.detectChanges();

    expect(localStorage.getItem('jwt_token')).toBe('jwt-prueba');
    expect(navegar).toHaveBeenCalledWith(['/admin/resumen']);
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('con credenciales incorrectas (401) muestra el mensaje y vuelve a habilitar el botón', () => {
    const { escribir, enviar, http, alerta, boton, navegar, refrescar } = crear();
    escribir('#email', 'admin@arquinova.com');
    escribir('#password', 'mala');

    enviar();
    http.expectOne(URL_LOGIN).flush({ error: 'Credenciales incorrectas' }, { status: 401, statusText: 'Unauthorized' });
    refrescar();

    expect(alerta()).toBe('Correo o contraseña incorrectos.');
    expect(boton().disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });

  it('si no hay conexión (status 0) pide verificar la conexión', () => {
    const { escribir, enviar, http, alerta, refrescar } = crear();
    escribir('#email', 'admin@arquinova.com');
    escribir('#password', 'x');

    enviar();
    http.expectOne(URL_LOGIN).error(new ProgressEvent('error'));
    refrescar();

    expect(alerta()).toBe('No se pudo conectar con el servidor. Verifica tu conexión.');
  });

  it('otro error con mensaje del servidor no lo muestra: usa el genérico fijo', () => {
    const { escribir, enviar, http, alerta, refrescar } = crear();
    escribir('#email', 'admin@arquinova.com');
    escribir('#password', 'x');

    enviar();
    http.expectOne(URL_LOGIN).flush({ message: 'Cuenta bloqueada temporalmente' }, { status: 423, statusText: 'Locked' });
    refrescar();

    expect(alerta()).toBe('Ocurrió un error al intentar iniciar sesión.');
  });

  it('otro error sin mensaje muestra el mensaje genérico', () => {
    const { escribir, enviar, http, alerta, refrescar } = crear();
    escribir('#email', 'admin@arquinova.com');
    escribir('#password', 'x');

    enviar();
    http.expectOne(URL_LOGIN).flush(null, { status: 500, statusText: 'Server Error' });
    refrescar();

    expect(alerta()).toBe('Ocurrió un error al intentar iniciar sesión.');
  });
});
