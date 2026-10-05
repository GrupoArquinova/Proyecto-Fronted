import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

function crearToken(exp: number): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64({ exp })}.firma`;
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
});
