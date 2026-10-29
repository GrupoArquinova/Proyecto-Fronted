import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/services/auth.service';

describe('DashboardComponent', () => {
  let http: HttpTestingController;

  function crear() {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([{ path: '**', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    http.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('arma el panel con la barra superior, el menú lateral y la zona de contenido', () => {
    const { el } = crear();

    expect(el.querySelector('.navbar .usuario-admin span')?.textContent).toBe('Admin');
    expect(el.querySelector('.navbar .usuario-admin svg.usuario-icono')).not.toBeNull();
    expect(el.querySelector('.navbar .brand span')).toBeNull();
    expect(el.querySelector('img.brand-logo')?.getAttribute('alt')).toBe('Logo Arquinova');
    expect(el.querySelector('app-sidebar')).not.toBeNull();
    expect(el.querySelector('main.main-content router-outlet')).not.toBeNull();
  });

  it('la esquina derecha muestra el icono de usuario y "Admin"; el nombre de la sesión aparece al pasar el mouse', () => {
    localStorage.setItem('user_name', 'Ana Gómez');
    const { el } = crear();

    expect(el.querySelector('.navbar .usuario-admin')?.getAttribute('title')).toBe('Ana Gómez');
    localStorage.removeItem('user_name');
  });

  it('el nombre del usuario es "Administrador" si no hay uno guardado, o el de la sesión', () => {
    expect(crear().componente.userName).toBe('Administrador');

    TestBed.resetTestingModule();
    localStorage.setItem('user_name', 'Ana Gómez');
    expect(crear().componente.userName).toBe('Ana Gómez');
  });

  it('el botón de hamburguesa abre y cierra el menú, y el fondo oscuro lo cierra', () => {
    const { fixture, componente, el } = crear();
    expect(componente.sidebarOpen).toBe(false);
    expect(el.querySelector('.sidebar-overlay')).toBeNull();

    el.querySelector<HTMLButtonElement>('.hamburger-btn')!.click();
    fixture.detectChanges();
    expect(componente.sidebarOpen).toBe(true);
    expect(el.querySelector('.admin-body')?.classList).toContain('sidebar-open');
    expect(el.querySelector('.sidebar-overlay')).not.toBeNull();

    el.querySelector<HTMLElement>('.sidebar-overlay')!.click();
    fixture.detectChanges();
    expect(componente.sidebarOpen).toBe(false);
    expect(el.querySelector('.admin-body')?.classList).not.toContain('sidebar-open');

    componente.toggleSidebar();
    expect(componente.sidebarOpen).toBe(true);
  });

  it('al navegar desde el menú lateral, el menú se cierra', () => {
    const { fixture, componente, el } = crear();
    componente.toggleSidebar();
    fixture.detectChanges();

    el.querySelector<HTMLAnchorElement>('app-sidebar a.nav-item')!.click();
    fixture.detectChanges();

    expect(componente.sidebarOpen).toBe(false);
  });

  it('"Cerrar sesión" cierra la sesión y lleva al inicio de sesión', () => {
    const { el } = crear();
    const cerrar = vi.spyOn(TestBed.inject(AuthService), 'cerrarSesion').mockReturnValue(of(undefined));
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    el.querySelector<HTMLButtonElement>('.logout-button')!.click();

    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('si la sesión ya había expirado también termina en el inicio de sesión', () => {
    const { componente } = crear();
    localStorage.setItem('jwt_token', 'token-invalido');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    componente.onLogout();

    expect(navegar).toHaveBeenCalledWith(['/login']);
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });
});
