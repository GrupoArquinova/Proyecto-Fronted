import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const ejecutar = (logueado: boolean, accesoPanel = true) => {
    const cerrar = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => logueado, tieneAccesoPanel: () => accesoPanel, logout: cerrar } }
      ]
    });
    return { resultado: TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)), cerrar };
  };

  it('permite el paso a quien tiene un rol del panel y sesion activa', () => {
    expect(ejecutar(true, true).resultado).toBe(true);
  });

  it('redirige a /login sin sesion', () => {
    const { resultado } = ejecutar(false);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('con sesion pero sin ningun rol del panel cierra la sesion local y manda a /login', () => {
    const { resultado, cerrar } = ejecutar(true, false);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/login');
    expect(cerrar).toHaveBeenCalled();
  });
});
