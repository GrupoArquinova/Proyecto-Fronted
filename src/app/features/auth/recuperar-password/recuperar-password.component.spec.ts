import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { RecuperarPasswordComponent } from './recuperar-password.component';

const URL = `${environment.apiUrl}/auth/forgot-password`;

function crear() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(RecuperarPasswordComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  const enviar = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  /** ngModel escribe de forma asíncrona: se espera a que el valor llegue al componente. */
  const escribir = async (correo: string) => {
    await fixture.whenStable(); // ngModel registra su control en una microtarea
    const input = el.querySelector<HTMLInputElement>('#correo')!;
    input.value = correo;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  return { fixture, el, http, enviar, escribir };
}

describe('RecuperarPasswordComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra el formulario y el enlace para volver al inicio de sesión', () => {
    const { el } = crear();

    expect(el.querySelector('h2')?.textContent).toContain('Recuperar Contraseña');
    expect(el.querySelector('#correo')).not.toBeNull();
    expect(el.querySelector('.btn-submit')?.textContent?.trim()).toBe('Enviar enlace');
    expect(el.querySelector('.card-footer a')?.getAttribute('href')).toBe('/login');
  });

  it('sin correo no llama al servidor y pide ingresarlo', () => {
    const { el, http, enviar } = crear();

    enviar();

    http.expectNone(URL);
    expect(el.querySelector('.error-msg')?.textContent).toContain('Ingresa un correo válido');
  });

  it('muestra la respuesta neutra del servidor y oculta el formulario', async () => {
    const { el, http, enviar, escribir, fixture } = crear();
    await escribir('alguien@correo.com');

    enviar();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'alguien@correo.com' });
    expect(el.querySelector<HTMLButtonElement>('.btn-submit')!.disabled).toBe(true);
    expect(el.querySelector('.btn-submit')?.textContent?.trim()).toBe('Enviando...');

    req.flush({ mensaje: 'Si el correo existe, recibirás un enlace.' });
    fixture.detectChanges();

    expect(el.querySelector('.success-box')?.textContent).toContain('Si el correo existe, recibirás un enlace.');
    expect(el.querySelector('form')).toBeNull();
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('si no hay conexión con el servidor lo dice y deja reintentar', async () => {
    const { el, http, enviar, escribir, fixture } = crear();
    await escribir('alguien@correo.com');

    enviar();
    http.expectOne(URL).error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(el.querySelector('.error-msg')?.textContent).toContain('No pudimos conectar con el servidor');
    expect(el.querySelector<HTMLButtonElement>('.btn-submit')!.disabled).toBe(false);
    expect(el.querySelector('.success-box')).toBeNull();
  });

  it('un error con mensaje del servidor lo muestra', async () => {
    const { el, http, enviar, escribir, fixture } = crear();
    await escribir('alguien@correo.com');

    enviar();
    http.expectOne(URL).flush({ mensaje: 'Demasiados intentos' }, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(el.querySelector('.error-msg')?.textContent).toContain('Demasiados intentos');
  });

  it('nunca muestra el texto que devuelve el servidor: usa un mensaje fijo', async () => {
    const { el, http, enviar, escribir, fixture } = crear();
    await escribir('alguien@correo.com');

    enviar();
    http.expectOne(URL).flush({ error: 'Servicio de correo caído' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.error-msg')?.textContent).not.toContain('Servicio de correo caído');
    expect(el.querySelector('.error-msg')?.textContent).toContain('Error al solicitar la recuperación');
  });

  it('un error sin detalles muestra el mensaje genérico', async () => {
    const { el, http, enviar, escribir, fixture } = crear();
    await escribir('alguien@correo.com');

    enviar();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.error-msg')?.textContent).toContain('Error al solicitar la recuperación');
  });
});
