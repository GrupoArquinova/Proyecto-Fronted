import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AsistenteProyectoComponent } from './asistente-proyecto.component';
import { PasoAsistente } from './asistente-proyecto.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;
const CLAVE = 'asistente_proyecto_borrador';

describe('AsistenteProyectoComponent', () => {
  let http: HttpTestingController;

  function crear(borrador?: { proyectoId: number; paso: number } | string) {
    if (borrador) localStorage.setItem(CLAVE, typeof borrador === 'string' ? borrador : JSON.stringify(borrador));
    TestBed.configureTestingModule({
      imports: [AsistenteProyectoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AsistenteProyectoComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const responderBorrador = (id: number, proyecto: object = { id, empresaId: 1, nombre: 'Casas Circacias' }) => {
      http.expectOne(`${API}/proyectos/${id}`).flush(proyecto);
      http.expectOne(`${API}/ubicaciones/proyecto/${id}`).flush(null, { status: 404, statusText: 'Not Found' });
      http.expectOne(`${API}/etapas/proyecto/${id}`).flush([]);
      http.expectOne(`${API}/lotes`).flush([]);
      http.expectOne(`${API}/zonas-comunes/proyecto/${id}`).flush([]);
      http.expectOne(`${API}/casas-modelo/proyecto/${id}`).flush([]);
      http.expectOne(`${API}/multimedia/proyecto/${id}`).flush([]);
      refrescar();
    };
    const botones = () => Array.from(el.querySelectorAll('ol.pasos button')) as HTMLButtonElement[];
    return { fixture, componente: fixture.componentInstance, el, refrescar, responderBorrador, botones };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('sin borrador muestra el paso 1 (datos del proyecto) y los seis pasos del asistente', () => {
    const { el, botones, componente } = crear();

    expect(el.querySelector('h1')!.textContent).toBe('Nuevo proyecto');
    expect(el.querySelector('app-paso-proyecto')).not.toBeNull();
    expect(el.querySelector('.borrador')).toBeNull();
    expect(botones().length).toBe(6);
    expect(componente.cargando()).toBe(false);
  });

  it('mientras recupera un borrador muestra "Cargando..."', () => {
    const { el } = crear({ proyectoId: 7, paso: 3 });

    expect(el.querySelector('.estado')!.textContent).toBe('Cargando...');
    http.match(() => true);
  });

  it('recupera el borrador: avisa con su nombre y abre el paso en el que se quedó', () => {
    const { el, responderBorrador, componente } = crear({ proyectoId: 7, paso: 3 });

    responderBorrador(7);

    expect(componente.cargando()).toBe(false);
    expect(el.querySelector('.borrador')!.textContent).toContain('Casas Circacias');
    expect(el.querySelector('app-paso-etapas')).not.toBeNull();
    expect(componente.asistente.paso()).toBe(3);
  });

  it('"Empezar un proyecto nuevo" descarta el borrador y vuelve al paso 1 en blanco', () => {
    const { el, responderBorrador, refrescar, componente } = crear({ proyectoId: 7, paso: 3 });
    responderBorrador(7);

    (el.querySelector('.borrador button') as HTMLButtonElement).click();
    refrescar();

    expect(el.querySelector('.borrador')).toBeNull();
    expect(el.querySelector('app-paso-proyecto')).not.toBeNull();
    expect(componente.asistente.tieneProyecto()).toBe(false);
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('si el borrador ya no existe en el servidor lo descarta y empieza de cero', () => {
    const { el, refrescar, componente } = crear({ proyectoId: 7, paso: 3 });

    http.expectOne(`${API}/proyectos/7`).flush(null, { status: 404, statusText: 'Not Found' });
    refrescar();

    expect(componente.cargando()).toBe(false);
    expect(componente.borradorRecuperado()).toBeNull();
    expect(componente.asistente.tieneProyecto()).toBe(false);
    expect(localStorage.getItem(CLAVE)).toBeNull();
    expect(el.querySelector('app-paso-proyecto')).not.toBeNull();
  });

  it('un borrador sin nombre de proyecto no rompe el aviso', () => {
    const { componente, responderBorrador } = crear({ proyectoId: 7, paso: 2 });

    responderBorrador(7, { id: 7, empresaId: 1 });

    expect(componente.borradorRecuperado()).toBe('');
  });

  it('marca cada paso como actual, completo o pendiente', () => {
    const { componente } = crear();
    const a = componente.asistente;
    a.fijarProyecto({ id: 7, empresaId: 1, nombre: 'X' });
    a.siguiente();
    a.siguiente();
    a.siguiente(); // paso 4, máximo 4

    expect([1, 2, 3, 4, 5, 6].map(n => componente.estado(n as PasoAsistente)))
      .toEqual(['completo', 'completo', 'completo', 'actual', 'pendiente', 'pendiente']);

    // Al volver atrás, el paso más lejano alcanzado (4) no queda marcado como completo hasta superarlo
    a.irAPaso(2);
    expect([1, 2, 3, 4, 5, 6].map(n => componente.estado(n as PasoAsistente)))
      .toEqual(['completo', 'actual', 'completo', 'pendiente', 'pendiente', 'pendiente']);
  });

  it('sin proyecto solo se puede ir al paso 1; con proyecto, hasta el paso más lejano alcanzado', () => {
    const { componente } = crear();
    const a = componente.asistente;

    expect([1, 2, 3].map(n => componente.puedeIr(n as PasoAsistente))).toEqual([true, false, false]);

    a.fijarProyecto({ id: 7, empresaId: 1, nombre: 'X' });
    a.siguiente();
    a.siguiente();
    expect([1, 2, 3, 4].map(n => componente.puedeIr(n as PasoAsistente))).toEqual([true, true, true, false]);
  });

  it('los botones de los pasos deshabilitan los inalcanzables, marcan el actual y navegan al hacer clic', () => {
    const { componente, refrescar, botones } = crear();
    const a = componente.asistente;
    a.fijarProyecto({ id: 7, empresaId: 1, nombre: 'X' });
    a.siguiente();
    a.siguiente();
    refrescar();

    expect(botones().map(b => b.disabled)).toEqual([false, false, false, true, true, true]);
    expect(botones()[2].getAttribute('aria-current')).toBe('step');
    expect(botones()[0].getAttribute('aria-current')).toBeNull();
    expect(botones()[0].textContent).toContain('✓');

    botones()[0].click();
    refrescar();
    expect(a.paso()).toBe(1);
    expect(botones()[1].textContent).toContain('✓');
  });

  it('muestra el componente correspondiente a cada paso', () => {
    const { componente, refrescar, el } = crear();
    const a = componente.asistente;
    a.fijarProyecto({ id: 7, empresaId: 1, nombre: 'X' });
    const esperados = ['app-paso-proyecto', 'app-paso-ubicacion', 'app-paso-etapas', 'app-paso-lotes', 'app-paso-contenido', 'app-paso-revisar'];

    esperados.forEach((selector, i) => {
      if (i > 0) a.siguiente();
      refrescar();
      expect(el.querySelector(selector), selector).not.toBeNull();
    });
    // Los pasos que cargan datos del servidor no deben dejar peticiones sin atender
    http.match(() => true);
  });
});
