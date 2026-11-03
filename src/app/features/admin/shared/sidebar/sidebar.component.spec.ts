import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarComponent } from './sidebar.component';
import { iniciarSesionFalsa } from '../../../../core/testing/jwt-falso';

describe('SidebarComponent', () => {
  afterEach(() => localStorage.clear());

  function crear(rol = 'ROLE_ADMINISTRADOR') {
    iniciarSesionFalsa(rol);
    TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [provideRouter([{ path: '**', children: [] }])] });
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const enlacesDe = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLAnchorElement>('a.nav-item')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);

  it('el administrador ve todos los enlaces del panel, en orden', () => {
    const { el } = crear();
    expect(enlacesDe(el)).toEqual([
      ['Resumen', '/admin/resumen'],
      ['Métricas', '/admin/metricas'],
      ['Proyectos', '/admin/proyectos'],
      ['Etapas', '/admin/etapas'],
      ['Lotes', '/admin/lotes'],
      ['Amenidades', '/admin/zonas-comunes'],
      ['Tipologías', '/admin/casas-modelo'],
      ['Multimedia', '/admin/multimedia'],
      ['Ubicaciones', '/admin/ubicaciones'],
      ['Solicitudes', '/admin/solicitudes'],
      ['Contenido institucional', '/admin/contenido-institucional'],
      ['Usuarios', '/admin/usuarios'],
      ['Historial de cambios', '/admin/historial'],
      ['Reportes', '/admin/reportes'],
    ]);
  });

  it('el comercial solo ve Métricas y Solicitudes', () => {
    const { el } = crear('ROLE_COMERCIAL');
    expect(enlacesDe(el)).toEqual([
      ['Métricas', '/admin/metricas'],
      ['Solicitudes', '/admin/solicitudes'],
    ]);
  });

  it('el editor solo ve las pantallas de contenido', () => {
    const { el } = crear('ROLE_EDITOR');
    const textos = enlacesDe(el).map((e) => e[0]);
    expect(textos).toEqual(['Proyectos', 'Etapas', 'Lotes', 'Amenidades', 'Tipologías', 'Multimedia', 'Ubicaciones', 'Contenido institucional']);
  });

  it('al hacer clic en un enlace avisa que se navegó (para cerrar el menú en móvil)', () => {
    const { el, componente } = crear();
    const alNavegar = vi.fn();
    componente.navigated.subscribe(alNavegar);

    el.querySelector<HTMLAnchorElement>('a.nav-item')!.click();
    el.querySelectorAll<HTMLAnchorElement>('a.nav-item')[3].click();

    expect(alNavegar).toHaveBeenCalledTimes(2);
  });

  it('"Cerrar sesión" emite el evento logout y no el de navegación', () => {
    const { el, componente } = crear();
    const alSalir = vi.fn();
    const alNavegar = vi.fn();
    componente.logout.subscribe(alSalir);
    componente.navigated.subscribe(alNavegar);

    const boton = el.querySelector<HTMLButtonElement>('.logout-button')!;
    expect(boton.textContent).toContain('Cerrar sesión');
    boton.click();

    expect(alSalir).toHaveBeenCalledTimes(1);
    expect(alNavegar).not.toHaveBeenCalled();
  });

  it('los métodos públicos emiten sus eventos', () => {
    const { componente } = crear();
    const alSalir = vi.fn();
    const alNavegar = vi.fn();
    componente.logout.subscribe(alSalir);
    componente.navigated.subscribe(alNavegar);

    componente.onLogout();
    componente.onNavigated();

    expect(alSalir).toHaveBeenCalledTimes(1);
    expect(alNavegar).toHaveBeenCalledTimes(1);
  });
});
