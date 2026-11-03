import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { jwtFalso } from '../testing/jwt-falso';

describe('AuthService: roles del token', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => localStorage.clear());

  const sesion = (roles: unknown) => localStorage.setItem('jwt_token', jwtFalso([], { roles }));

  it('sin sesión no hay roles ni acceso al panel', () => {
    expect(auth.roles()).toEqual([]);
    expect(auth.tieneAccesoPanel()).toBe(false);
    expect(auth.tieneRol('ADMINISTRADOR')).toBe(false);
  });

  it('lee los roles del token sin el prefijo ROLE_', () => {
    sesion(['ROLE_COMERCIAL']);
    expect(auth.roles()).toEqual(['COMERCIAL']);
    expect(auth.tieneRol('COMERCIAL')).toBe(true);
    expect(auth.tieneRol('ADMINISTRADOR', 'EDITOR')).toBe(false);
    expect(auth.tieneAccesoPanel()).toBe(true);
  });

  it('acepta el rol con o sin prefijo, ignora los desconocidos y no repite', () => {
    sesion(['EDITOR', 'ROLE_EDITOR', 'ROLE_SUPERUSUARIO', 42]);
    expect(auth.roles()).toEqual(['EDITOR']);
  });

  it('un token sin lista de roles (de una versión anterior) no da acceso al panel', () => {
    sesion(undefined);
    expect(auth.roles()).toEqual([]);
    expect(auth.tieneAccesoPanel()).toBe(false);
  });

  it('esAdministrador sigue siendo solo para el administrador', () => {
    sesion(['ROLE_EDITOR']);
    expect(auth.esAdministrador()).toBe(false);
    sesion(['ROLE_ADMINISTRADOR']);
    expect(auth.esAdministrador()).toBe(true);
  });
});
