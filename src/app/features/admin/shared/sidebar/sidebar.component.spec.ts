import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  function crear() {
    TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [provideRouter([{ path: '**', children: [] }])] });
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('lista los enlaces del panel con su ruta, en orden', () => {
    const { el } = crear();

    const enlaces = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.nav-item')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(enlaces).toEqual([
      ['Resumen', '/admin/resumen'],
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
      ['Reportes', '/admin/reportes'],
    ]);
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
