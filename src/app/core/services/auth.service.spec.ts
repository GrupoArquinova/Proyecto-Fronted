import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

function crearToken(exp: number, extra: object = {}): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64({ exp, ...extra })}.firma`;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
  });

  it('no esta logueado sin token', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('esta logueado con un token vigente', () => {
    localStorage.setItem('jwt_token', crearToken(Math.floor(Date.now() / 1000) + 3600));
    expect(service.isLoggedIn()).toBe(true);
  });

  it('limpia la sesion si el token expiro', () => {
    localStorage.setItem('jwt_token', crearToken(Math.floor(Date.now() / 1000) - 10));
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });

  it('trata un token mal formado como expirado', () => {
    localStorage.setItem('jwt_token', 'basura');
    expect(service.isLoggedIn()).toBe(false);
  });

  describe('roles', () => {
    it('reconoce al administrador por la lista de roles del token', () => {
      localStorage.setItem('jwt_token', crearToken(Math.floor(Date.now() / 1000) + 3600, { roles: ['ROLE_ADMINISTRADOR'] }));
      expect(service.esAdministrador()).toBe(true);
    });

    it('un token con otro rol no es de administrador', () => {
      localStorage.setItem('jwt_token', crearToken(Math.floor(Date.now() / 1000) + 3600, { roles: ['ROLE_USUARIO'] }));
      expect(service.esAdministrador()).toBe(false);
    });

    it('un token sin lista de roles (versión anterior) no es de administrador', () => {
      localStorage.setItem('jwt_token', crearToken(Math.floor(Date.now() / 1000) + 3600));
      expect(service.esAdministrador()).toBe(false);
    });

    it('sin token no es administrador', () => {
      expect(service.esAdministrador()).toBe(false);
    });
  });

  describe('renovación de la sesión', () => {
    const ahora = () => Math.floor(Date.now() / 1000);

    it('no hace falta renovar una sesión recién iniciada', () => {
      localStorage.setItem('jwt_token', crearToken(ahora() + 3500));
      expect(service.necesitaRenovar()).toBe(false);
    });

    it('hace falta renovar cuando quedan menos de 20 minutos', () => {
      localStorage.setItem('jwt_token', crearToken(ahora() + 10 * 60));
      expect(service.necesitaRenovar()).toBe(true);
    });

    it('no se renueva una sesión que ya venció ni un token mal formado', () => {
      localStorage.setItem('jwt_token', crearToken(ahora() - 5));
      expect(service.necesitaRenovar()).toBe(false);
      localStorage.setItem('jwt_token', 'basura');
      expect(service.necesitaRenovar()).toBe(false);
    });

    it('renovarSesion guarda el token nuevo', () => {
      const http = TestBed.inject(HttpTestingController);
      localStorage.setItem('jwt_token', crearToken(ahora() + 600));
      let recibido: string | null | undefined;

      service.renovarSesion().subscribe(token => (recibido = token));
      const peticion = http.expectOne(`${environment.apiUrl}/auth/renovar`);
      expect(peticion.request.method).toBe('POST');
      peticion.flush({ token: 'token-nuevo', tipo: 'Bearer' });

      expect(recibido).toBe('token-nuevo');
      expect(localStorage.getItem('jwt_token')).toBe('token-nuevo');
    });

    it('varias peticiones que piden renovar a la vez hacen una sola llamada', () => {
      const http = TestBed.inject(HttpTestingController);
      const resultados: (string | null)[] = [];

      service.renovarSesion().subscribe(t => resultados.push(t));
      service.renovarSesion().subscribe(t => resultados.push(t));
      http.expectOne(`${environment.apiUrl}/auth/renovar`).flush({ token: 'unico' });

      expect(resultados).toEqual(['unico', 'unico']);
    });

    it('si el backend rechaza la renovación emite null y conserva el token actual', () => {
      const http = TestBed.inject(HttpTestingController);
      const actual = crearToken(ahora() + 600);
      localStorage.setItem('jwt_token', actual);
      let recibido: string | null | undefined;

      service.renovarSesion().subscribe(token => (recibido = token));
      http.expectOne(`${environment.apiUrl}/auth/renovar`).flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(recibido).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBe(actual);
    });
  });
});
