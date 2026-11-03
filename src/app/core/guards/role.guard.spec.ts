import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inicioPanelGuard, roleGuard } from './role.guard';
import { PERMISOS_PANEL } from '../models/roles';
import { ToastService } from '../services/toast.service';
import { iniciarSesionFalsa } from '../testing/jwt-falso';

describe('roleGuard', () => {
  afterEach(() => localStorage.clear());

  function ejecutar(guard: ReturnType<typeof roleGuard>, ...roles: string[]) {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (roles.length) iniciarSesionFalsa(...roles);
    const aviso = vi.fn();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ToastService, useValue: { showInfo: aviso } }] });
    const resultado = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const router = TestBed.inject(Router);
    return { resultado, aviso, url: resultado instanceof UrlTree ? router.serializeUrl(resultado) : resultado };
  }

  it('deja pasar a un rol permitido', () => {
    expect(ejecutar(roleGuard(PERMISOS_PANEL['metricas']), 'ROLE_COMERCIAL').resultado).toBe(true);
    expect(ejecutar(roleGuard(PERMISOS_PANEL['historial']), 'ROLE_ADMINISTRADOR').resultado).toBe(true);
  });

  it('el comercial que entra a una pantalla de contenido va a Métricas (su inicio), con aviso, sin bucle', () => {
    const { url, aviso } = ejecutar(roleGuard(PERMISOS_PANEL['proyectos']), 'ROLE_COMERCIAL');
    expect(url).toBe('/admin/metricas');
    expect(aviso).toHaveBeenCalledWith('No tienes permiso para ver esa pantalla.');
  });

  it('el editor que entra a usuarios o historial va a Proyectos', () => {
    expect(ejecutar(roleGuard(PERMISOS_PANEL['usuarios']), 'ROLE_EDITOR').url).toBe('/admin/proyectos');
    TestBed.resetTestingModule();
    expect(ejecutar(roleGuard(PERMISOS_PANEL['historial']), 'ROLE_EDITOR').url).toBe('/admin/proyectos');
  });

  it('el administrador siempre tiene permiso en todas las secciones', () => {
    for (const seccion of Object.keys(PERMISOS_PANEL)) {
      TestBed.resetTestingModule();
      expect(ejecutar(roleGuard(PERMISOS_PANEL[seccion]), 'ROLE_ADMINISTRADOR').resultado, seccion).toBe(true);
    }
  });

  it('el destino de redirección de cada rol está permitido para ese rol (nunca hay bucle)', () => {
    const casos: [string, string][] = [['ROLE_ADMINISTRADOR', 'resumen'], ['ROLE_COMERCIAL', 'metricas'], ['ROLE_EDITOR', 'proyectos']];
    for (const [rol, inicio] of casos) {
      TestBed.resetTestingModule();
      localStorage.clear();
      expect(ejecutar(roleGuard(PERMISOS_PANEL[inicio]), rol).resultado, `${rol} → ${inicio}`).toBe(true);
    }
  });

  it('sin rol del panel manda al login', () => {
    expect(ejecutar(roleGuard(PERMISOS_PANEL['metricas'])).url).toBe('/login');
  });
});

describe('inicioPanelGuard', () => {
  afterEach(() => localStorage.clear());

  const destino = (...roles: string[]) => {
    if (roles.length) iniciarSesionFalsa(...roles);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const r = TestBed.runInInjectionContext(() => inicioPanelGuard({} as never, {} as never));
    return TestBed.inject(Router).serializeUrl(r as UrlTree);
  };

  it('lleva a cada rol a su pantalla de inicio', () => {
    expect(destino('ROLE_ADMINISTRADOR')).toBe('/admin/resumen');
    TestBed.resetTestingModule();
    expect(destino('ROLE_COMERCIAL')).toBe('/admin/metricas');
    TestBed.resetTestingModule();
    expect(destino('ROLE_EDITOR')).toBe('/admin/proyectos');
  });

  it('sin rol va al login', () => {
    expect(destino()).toBe('/login');
  });
});
