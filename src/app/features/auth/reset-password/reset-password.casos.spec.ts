import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { ResetPasswordComponent } from './reset-password.component';

const URL = `${environment.apiUrl}/auth/reset-password`;
const CLAVE_VALIDA = 'Clave-Segura1!';

function crear(token: string | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } },
    ],
  });
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ResetPasswordComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  const escribir = async (selector: string, valor: string) => {
    await fixture.whenStable(); // ngModel registra su control en una microtarea
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const enviar = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return { fixture, el, http, navegar, escribir, enviar, c: fixture.componentInstance };
}

describe('ResetPasswordComponent (casos)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('con el enlace del correo quita el token de la dirección para que no quede en el historial', () => {
    const { navegar } = crear('abc-123');

    expect(navegar).toHaveBeenCalledWith([], { queryParams: {}, replaceUrl: true });
  });

  it('sin enlace no toca la dirección', () => {
    const { navegar } = crear(null);

    expect(navegar).not.toHaveBeenCalled();
  });

  it('cada requisito de la contraseña se evalúa por separado', () => {
    const { c } = crear('t');

    c.nuevaPassword = 'abc';
    expect([c.tieneLongitudMinima, c.tieneMayuscula, c.tieneMinuscula, c.tieneNumero, c.tieneEspecial])
      .toEqual([false, false, true, false, false]);

    c.nuevaPassword = 'ABCDEFGH';
    expect([c.tieneLongitudMinima, c.tieneMayuscula, c.tieneMinuscula]).toEqual([true, true, false]);

    c.nuevaPassword = '12345678a';
    expect([c.tieneNumero, c.tieneEspecial, c.esPasswordValida]).toEqual([true, false, false]);

    c.nuevaPassword = CLAVE_VALIDA;
    expect(c.esPasswordValida).toBe(true);
  });

  it('el checklist aparece al escribir y marca los requisitos cumplidos', async () => {
    const { el, escribir } = crear('t');
    expect(el.querySelector('.password-requirements')).toBeNull();

    await escribir('#nuevaPassword', 'Hola1');

    const items = Array.from(el.querySelectorAll('.password-requirements li'));
    expect(items).toHaveLength(5);
    // mayúscula, minúscula y número cumplidos; longitud y especial pendientes
    expect(items.map(li => li.classList.contains('valid'))).toEqual([false, true, true, true, false]);
    expect(items[1].textContent).toContain('✓');
    expect(items[0].textContent).toContain('○');
  });

  it('el botón de enviar queda deshabilitado hasta que la contraseña cumple todo', async () => {
    const { el, escribir } = crear('t');
    const boton = () => el.querySelector<HTMLButtonElement>('.btn-submit')!;
    expect(boton().disabled).toBe(true);

    await escribir('#nuevaPassword', 'corta');
    expect(boton().disabled).toBe(true);

    await escribir('#nuevaPassword', CLAVE_VALIDA);
    expect(boton().disabled).toBe(false);
  });

  it('el ojo alterna entre ocultar y mostrar la contraseña', () => {
    const { el, fixture, c } = crear('t');
    const campo = () => el.querySelector<HTMLInputElement>('#nuevaPassword')!;
    expect(campo().type).toBe('password');

    el.querySelector<HTMLButtonElement>('.btn-toggle-eye')!.click();
    fixture.detectChanges();

    expect(c.mostrarPassword).toBe(true);
    expect(campo().type).toBe('text');
    expect(el.querySelectorAll('.btn-toggle-eye svg circle')).toHaveLength(1);

    el.querySelector<HTMLButtonElement>('.btn-toggle-eye')!.click();
    fixture.detectChanges();
    expect(campo().type).toBe('password');
  });

  it('sin enlace, el código se escribe a mano y se envía junto con la contraseña', async () => {
    const { el, http, escribir, enviar } = crear(null);
    await escribir('#token', 'CODIGO-9');
    await escribir('#nuevaPassword', CLAVE_VALIDA);

    enviar();

    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({ token: 'CODIGO-9', nuevaPassword: CLAVE_VALIDA });
    expect(el.querySelector('.btn-submit')?.textContent?.trim()).toBe('Guardando...');
    req.flush({ mensaje: 'ok' });
  });

  it('enviar sin código o con contraseña débil no llama al servidor y avisa', async () => {
    const { el, http, escribir, enviar, c } = crear(null);
    await escribir('#nuevaPassword', CLAVE_VALIDA);

    enviar(); // falta el código

    http.expectNone(URL);
    expect(c.errorMessage()).toContain('cumple los requisitos de la contraseña');
    expect(el.querySelector('.error-msg')?.textContent).toContain('Por favor completa todos los campos');
  });

  it('al cambiar la contraseña muestra el mensaje del servidor y vuelve al login a los 2,5 s', async () => {
    const { el, fixture, http, navegar, escribir, enviar, c } = crear('tok');
    await escribir('#nuevaPassword', CLAVE_VALIDA);
    vi.useFakeTimers();

    enviar();
    http.expectOne(URL).flush({ mensaje: 'Contraseña cambiada' });
    fixture.detectChanges();

    expect(c.successMessage()).toBe('Contraseña cambiada');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('.success-box')?.textContent).toContain('Redirigiendo al inicio de sesión');
    expect(navegar).not.toHaveBeenCalledWith(['/login']);

    vi.advanceTimersByTime(2500);
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('si la persona sale antes de los 2,5 s no se la redirige después', async () => {
    const { fixture, http, navegar, escribir, enviar } = crear('tok');
    await escribir('#nuevaPassword', CLAVE_VALIDA);
    vi.useFakeTimers();

    enviar();
    http.expectOne(URL).flush({ mensaje: 'Contraseña cambiada' });
    fixture.destroy();
    vi.advanceTimersByTime(2500);

    expect(navegar).not.toHaveBeenCalledWith(['/login']);
  });

  it('si el servidor no manda mensaje usa el de éxito por defecto', async () => {
    const { http, escribir, enviar, c } = crear('tok');
    await escribir('#nuevaPassword', CLAVE_VALIDA);
    vi.useFakeTimers();

    enviar();
    http.expectOne(URL).flush({});

    expect(c.successMessage()).toBe('Contraseña actualizada con éxito.');
  });

  it('un enlace vencido (400) muestra el mensaje fijo, no el del servidor', async () => {
    const { http, escribir, enviar, c, fixture, el } = crear('tok');
    await escribir('#nuevaPassword', CLAVE_VALIDA);

    enviar();
    http.expectOne(URL).flush({ mensaje: 'El enlace expiró' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(c.errorMessage()).toBe('El enlace es inválido o ha expirado. Solicita uno nuevo.');
    expect(c.isLoading()).toBe(false);
    expect(el.querySelector('.error-msg')?.textContent).not.toContain('El enlace expiró');
  });

  it('un error con campo "error" tampoco se muestra', async () => {
    const { http, escribir, enviar, c } = crear('tok');
    await escribir('#nuevaPassword', CLAVE_VALIDA);

    enviar();
    http.expectOne(URL).flush({ error: 'Token inválido' }, { status: 400, statusText: 'Bad Request' });

    expect(c.errorMessage()).toBe('El enlace es inválido o ha expirado. Solicita uno nuevo.');
  });

  it('un error sin detalles dice que el enlace es inválido o expiró', async () => {
    const { http, escribir, enviar, c } = crear('tok');
    await escribir('#nuevaPassword', CLAVE_VALIDA);

    enviar();
    http.expectOne(URL).flush(null, { status: 400, statusText: 'Bad Request' });

    expect(c.errorMessage()).toBe('El enlace es inválido o ha expirado. Solicita uno nuevo.');
  });
});
