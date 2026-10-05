import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const ejecutar = (logueado: boolean) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => logueado } }]
    });
    return TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
  };

  it('permite el paso con sesion activa', () => {
    expect(ejecutar(true)).toBe(true);
  });

  it('redirige a /login sin sesion', () => {
    const res = ejecutar(false) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(res)).toBe('/login');
  });
});
