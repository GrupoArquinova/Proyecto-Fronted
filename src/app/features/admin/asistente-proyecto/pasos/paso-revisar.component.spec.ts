import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasoRevisarComponent } from './paso-revisar.component';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Proyecto } from '../../../../core/models/proyecto.models';
import { environment } from '../../../../../environments/environment';

const PROYECTOS = `${environment.apiUrl}/proyectos`;
const CLAVE = 'asistente_proyecto_borrador';

const completo: Proyecto = {
  id: 6, empresaId: 1, nombre: 'Los Andes', slug: 'los-andes', descripcion: 'Desc', estadoProyecto: 'EN_CONSTRUCCION',
  tipoRegistro: 'OFERTA_COMERCIAL', tipoProyecto: 'RURAL', participacion: 'Diseño', destacado: false,
  imagenUrl: 'https://cdn.test/p.jpg', fechaLanzamiento: '2026-01-01', publicado: false
};

describe('PasoRevisarComponent', () => {
  let http: HttpTestingController;

  function crear(proyecto: Proyecto | null = completo, estado: (a: AsistenteProyectoService) => void = () => undefined) {
    TestBed.configureTestingModule({
      imports: [PasoRevisarComponent],
      providers: [AsistenteProyectoService, provideRouter([{ path: 'admin/proyectos', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (proyecto) asistente.fijarProyecto(proyecto);
    estado(asistente);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PasoRevisarComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const boton = (texto: string) => Array.from(el.querySelectorAll('button')).find(b => b.textContent!.includes(texto)) as HTMLButtonElement;
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, boton };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();
  const ubicacion = { id: 1, proyectoId: 6, ciudad: 'Armenia', departamento: 'Quindío' };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin proyecto no muestra nada', () => {
    const { el } = crear(null);

    expect(el.textContent!.trim()).toBe('');
  });

  it('un proyecto completo no muestra avisos de faltantes', () => {
    const { el, componente } = crear(completo, a => {
      a.ubicacion.set(ubicacion as never);
      a.lotes.set([{ id: 1, codigo: "LT-01", areaM2: 1, estadoId: 1 }] as never);
    });

    expect(componente.avisos()).toEqual([]);
    expect(el.querySelector('.avisos')).toBeNull();
  });

  it('avisa de lo que falta: portada, ubicación, lotes y amenidades sin fotos', () => {
    const { el, componente } = crear({ ...completo, imagenUrl: undefined }, a => {
      a.zonas.set([
        { id: 1, proyectoId: 6, nombre: 'Piscina', imagenes: [] },
        { id: 2, proyectoId: 6, nombre: 'Salón' },
        { id: 3, proyectoId: 6, nombre: 'Sendero', imagenes: [{ id: 1, zonaComunId: 3, imagenUrl: 'x' }] }
      ] as never);
    });

    expect(componente.avisos()).toEqual([
      'No tiene foto de portada.',
      'No tiene ubicación registrada.',
      'No tiene lotes: la sección Lotes y Disponibilidad no aparecerá.',
      '2 amenidades no tienen fotos.'
    ]);
    expect(el.querySelectorAll('.avisos li').length).toBe(4);
  });

  it('con una sola amenidad sin fotos usa el singular', () => {
    const { componente } = crear(completo, a => {
      a.ubicacion.set(ubicacion as never);
      a.lotes.set([{ id: 1, codigo: "LT-01", areaM2: 1, estadoId: 1 }] as never);
      a.zonas.set([{ id: 1, proyectoId: 6, nombre: 'Piscina', imagenes: [] }] as never);
    });

    expect(componente.avisos()).toEqual(['1 amenidad no tiene fotos.']);
  });

  it('el resumen cuenta etapas, lotes por estado, amenidades con fotos, casas y recursos', () => {
    const { el, componente } = crear(completo, a => {
      a.etapas.set([{ id: 1, proyectoId: 6, nombre: 'E1', orden: 1 }, { id: 2, proyectoId: 6, nombre: 'E2', orden: 2 }] as never);
      a.lotes.set([
        { id: 1, codigo: 'A', areaM2: 1, estadoNombre: 'DISPONIBLE' },
        { id: 2, codigo: 'B', areaM2: 1, estadoId: 1 },
        { id: 3, codigo: 'C', areaM2: 1, estadoNombre: 'RESERVADO' },
        { id: 4, codigo: 'D', areaM2: 1, estadoNombre: 'VENDIDO' },
        { id: 5, codigo: 'E', areaM2: 1, estadoNombre: 'EN LIQUIDACIÓN' }
      ] as never);
      a.zonas.set([{ id: 1, proyectoId: 6, nombre: 'P', imagenes: [{ id: 1, zonaComunId: 1, imagenUrl: 'a' }, { id: 2, zonaComunId: 1, imagenUrl: 'b' }] }, { id: 2, proyectoId: 6, nombre: 'S' }] as never);
      a.casas.set([{ id: 1, proyectoId: 6, nombre: "Casa" }] as never);
      a.recursos.set([{ id: 1, tipo: 'VIDEO', url: 'u' }, { id: 2, tipo: 'PDF', url: 'u2' }] as never);
    });

    expect(componente.conteo()).toEqual({ disponible: 2, reservado: 1, vendido: 1 });
    expect(componente.fotosZonas()).toBe(2);
    const cifras = Array.from(el.querySelectorAll('.cifra')).map(c => c.textContent);
    expect(cifras).toEqual(['2', '5', '2', '1', '2']);
    expect(el.querySelector('.resumen')!.textContent).toContain('2 disponibles · 1 reservados · 1 vendidos');
    expect(el.querySelector('.resumen')!.textContent).toContain('2 fotos');
  });

  it('publicar reenvía el proyecto completo con publicado=true, avisa y muestra el éxito', () => {
    const { boton, el, refrescar, asistente, componente } = crear(completo);

    boton('Publicar proyecto').click();
    const peticion = http.expectOne(`${PROYECTOS}/6`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      empresaId: 1, nombre: 'Los Andes', slug: 'los-andes', descripcion: 'Desc', estadoProyecto: 'EN_CONSTRUCCION',
      tipoRegistro: 'OFERTA_COMERCIAL', tipoProyecto: 'RURAL', participacion: 'Diseño', destacado: false,
      imagenUrl: 'https://cdn.test/p.jpg', fechaLanzamiento: '2026-01-01', publicado: true
    });
    expect(componente.guardando()).toBe(true);
    peticion.flush({ ...completo, publicado: true });
    refrescar();

    expect(asistente.proyecto()?.publicado).toBe(true);
    expect(componente.publicadoAhora()).toBe(true);
    expect(componente.guardando()).toBe(false);
    expect(avisos()[0]).toMatchObject({ type: 'success', message: 'Proyecto publicado' });
    expect(el.querySelector('.exito h3')!.textContent).toBe('Proyecto publicado');
    expect(el.querySelector('.acciones')).toBeNull();
    expect(el.querySelector('a[target=_blank]')!.getAttribute('href')).toBe('/proyectos/6');
  });

  it('si falla la publicación avisa y deja volver a intentar', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { boton, componente } = crear(completo);

    boton('Publicar proyecto').click();
    http.expectOne(`${PROYECTOS}/6`).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0]).toMatchObject({ type: 'error' });
    expect(avisos()[0].message).toContain('No se pudo publicar el proyecto');
    expect(consola).toHaveBeenCalled();
    expect(componente.guardando()).toBe(false);
    expect(componente.publicadoAhora()).toBe(false);
  });

  it('publicar sin id de proyecto no hace nada', () => {
    const { componente } = crear({ ...completo, id: undefined });

    componente.publicar();

    http.expectNone(PROYECTOS);
    expect(componente.guardando()).toBe(false);
  });

  it('un proyecto ya publicado lo indica', () => {
    const { el } = crear({ ...completo, publicado: true });

    expect(el.querySelector('.ayuda')!.textContent).toContain('Este proyecto ya estaba publicado');
  });

  it('"Guardar sin publicar" informa, borra el borrador y vuelve a la lista de proyectos', () => {
    const { boton, asistente } = crear(completo);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(localStorage.getItem(CLAVE)).not.toBeNull();

    boton('Guardar sin publicar').click();

    expect(avisos()[0]).toMatchObject({ type: 'info' });
    expect(avisos()[0].message).toContain('guardado sin publicar');
    expect(localStorage.getItem(CLAVE)).toBeNull();
    expect(asistente.tieneProyecto()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/admin/proyectos']);
  });

  it('Atrás retrocede un paso', () => {
    const { boton, asistente } = crear(completo);
    asistente.paso.set(6);

    boton('Atrás').click();

    expect(asistente.paso()).toBe(5);
  });

  it('tras publicar, "Ir a Proyectos" termina el asistente y "Crear otro proyecto" lo reinicia', () => {
    const { boton, el, refrescar, asistente, componente } = crear(completo);
    boton('Publicar proyecto').click();
    http.expectOne(`${PROYECTOS}/6`).flush({ ...completo, publicado: true });
    refrescar();

    (el.querySelector('a.claro') as HTMLAnchorElement).click();
    expect(asistente.tieneProyecto()).toBe(false);
    expect(localStorage.getItem(CLAVE)).toBeNull();

    asistente.fijarProyecto(completo);
    boton('Crear otro proyecto').click();
    expect(asistente.tieneProyecto()).toBe(false);
    expect(componente.publicadoAhora()).toBe(false);
  });
});
