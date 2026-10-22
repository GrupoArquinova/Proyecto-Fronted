import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const API = `${environment.apiUrl}/auth`;

function token(exp: number | null, extra: object = {}): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64(exp === null ? extra : { exp, ...extra })}.firma`;
}

const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

function crear(plataforma = 'browser') {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: plataforma }],
  });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService · inicio y cierre de sesión', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('login guarda el token y el nombre de quien entró', () => {
    const { auth, http } = crear();

    auth.login({ correo: 'admin@arquinova.com', password: 'x' } as never).subscribe();
    const peticion = http.expectOne(`${API}/login`);
    expect(peticion.request.body).toEqual({ correo: 'admin@arquinova.com', password: 'x' });
    peticion.flush({ token: 'abc.def.ghi', nombre: 'Gabriel' });

    expect(localStorage.getItem('jwt_token')).toBe('abc.def.ghi');
    expect(auth.getUserName()).toBe('Gabriel');
    http.verify();
  });

  it('si la respuesta no trae nombre usa "Administrador", y si no trae token no guarda nada', () => {
    const { auth, http } = crear();

    auth.login({} as never).subscribe();
    http.expectOne(`${API}/login`).flush({ token: 'abc.def.ghi' });
    expect(auth.getUserName()).toBe('Administrador');

    localStorage.clear();
    auth.login({} as never).subscribe();
    http.expectOne(`${API}/login`).flush({ nombre: 'Sin token' });
    expect(localStorage.getItem('jwt_token')).toBeNull();
    http.verify();
  });

  it('pide recuperar la contraseña y restablecerla con el token del correo', () => {
    const { auth, http } = crear();

    auth.solicitarRecuperacion({ correo: 'a@a.co' } as never).subscribe();
    expect(http.expectOne(`${API}/forgot-password`).request.body).toEqual({ correo: 'a@a.co' });

    auth.restablecerPassword({ token: 't', nuevaPassword: 'Nueva123*' } as never).subscribe();
    expect(http.expectOne(`${API}/reset-password`).request.body).toEqual({ token: 't', nuevaPassword: 'Nueva123*' });
    http.verify();
  });

  it('cerrar sesión avisa al backend con el token y limpia la sesión local', () => {
    const { auth, http } = crear();
    localStorage.setItem('jwt_token', token(enUnaHora()));
    localStorage.setItem('user_name', 'Gabriel');
    let terminado = false;

    auth.cerrarSesion().subscribe(() => (terminado = true));
    const peticion = http.expectOne(`${API}/logout`);
    expect(peticion.request.headers.get('Authorization')).toMatch(/^Bearer /);
    peticion.flush({});

    expect(terminado).toBe(true);
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('user_name')).toBeNull();
    http.verify();
  });

  it('cerrar sesión borra también el borrador del asistente de proyectos (con o sin backend)', () => {
    const { auth, http } = crear();
    localStorage.setItem('jwt_token', token(enUnaHora()));
    localStorage.setItem('asistente_proyecto_borrador', '{"proyectoId":3,"paso":2}');
    auth.cerrarSesion().subscribe();
    http.expectOne(`${API}/logout`).flush({});
    expect(localStorage.getItem('asistente_proyecto_borrador')).toBeNull();

    localStorage.setItem('asistente_proyecto_borrador', '{"proyectoId":3,"paso":2}');
    auth.cerrarSesion().subscribe(); // sin token: no hay llamada, pero igual se limpia
    expect(localStorage.getItem('asistente_proyecto_borrador')).toBeNull();
  });

  it('cerrar sesión limpia la sesión local aunque el backend falle', () => {
    const { auth, http } = crear();
    localStorage.setItem('jwt_token', token(enUnaHora()));

    auth.cerrarSesion().subscribe();
    http.expectOne(`${API}/logout`).flush(null, { status: 500, statusText: 'Error' });

    expect(localStorage.getItem('jwt_token')).toBeNull();
    http.verify();
  });

  it('sin token o con el token vencido cerrar sesión no llama al backend', () => {
    const { auth, http } = crear();

    auth.cerrarSesion().subscribe();
    localStorage.setItem('jwt_token', token(Math.floor(Date.now() / 1000) - 10));
    auth.cerrarSesion().subscribe();

    http.expectNone(`${API}/logout`);
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });

  it('un token sin "exp" se considera vigente (el backend decide) y sin nombre guardado usa el de por defecto', () => {
    const { auth } = crear();
    localStorage.setItem('jwt_token', token(null, { sub: 'a@a.co' }));

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.necesitaRenovar()).toBe(false);
    expect(auth.getUserName()).toBe('Administrador');
  });

  it('en el servidor (sin navegador) no hay sesión, no se guarda nada y no falla', () => {
    const { auth, http } = crear('server');

    auth.login({} as never).subscribe();
    http.expectOne(`${API}/login`).flush({ token: 'abc.def.ghi', nombre: 'X' });

    expect(auth.getToken()).toBeNull();
    expect(auth.getUserName()).toBe('Administrador');
    expect(auth.isLoggedIn()).toBe(false);
    expect(() => auth.logout()).not.toThrow();
    expect(localStorage.getItem('jwt_token')).toBeNull();

    auth.renovarSesion().subscribe();
    http.expectOne(`${API}/renovar`).flush({ token: 'nuevo' });
    expect(localStorage.getItem('jwt_token')).toBeNull();
    http.verify();
  });
});
