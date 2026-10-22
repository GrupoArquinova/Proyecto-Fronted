import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContenidoInstitucionalComponent } from './contenido.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

const CONTENIDOS = `${environment.apiUrl}/contenidos-institucionales`;
const POR_EMPRESA = `${CONTENIDOS}/empresa/1`;

const secciones = [
  { id: 1, empresaId: 1, seccion: 'VISION', titulo: 'Nuestra Visión', contenido: 'Ser líderes', tituloEn: null, contenidoEn: null, publicado: true, actualizadoEn: '2026-05-10T10:00:00' },
  { id: 2, empresaId: 1, seccion: 'VALORES', titulo: 'Valores', contenido: 'Honestidad', tituloEn: 'Values', contenidoEn: 'Honesty', publicado: false },
];

describe('ContenidoInstitucionalComponent', () => {
  let http: HttpTestingController;

  function crear(opciones: { lista?: unknown[]; fallar?: boolean } = {}) {
    TestBed.configureTestingModule({
      imports: [ContenidoInstitucionalComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ContenidoInstitucionalComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const peticion = http.expectOne(POR_EMPRESA);
    if (opciones.fallar) peticion.flush(null, { status: 500, statusText: 'Error' });
    else peticion.flush(structuredClone(opciones.lista ?? secciones));
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();
  const esperar = () => new Promise((r) => setTimeout(r, 0));

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  describe('lista', () => {
    it('muestra una tarjeta por sección con su título, clave y contenido', async () => {
      const { fixture, el } = crear();
      await fixture.whenStable();
      fixture.detectChanges();

      const tarjetas = el.querySelectorAll('.contenido-card');
      expect(tarjetas.length).toBe(2);
      expect(tarjetas[0].querySelector('.titulo-texto')?.textContent).toBe('Nuestra Visión');
      expect(tarjetas[0].querySelector('.badge-seccion')?.textContent).toContain('VISION');
      expect(tarjetas[0].querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Ser líderes');
      expect(tarjetas[1].querySelectorAll<HTMLTextAreaElement>('textarea')[1].value).toBe('Honesty');
      expect(tarjetas[0].querySelector('.audit-text')?.textContent).toContain('5/10/26');
      expect(tarjetas[1].querySelector('.audit-text')).toBeNull();
      expect(tarjetas[0].querySelector('.switch')?.getAttribute('title')).toBe('Publicado');
      expect(tarjetas[1].querySelector('.switch')?.getAttribute('title')).toBe('Oculto');
    });

    it('si no hay secciones no dibuja tarjetas', () => {
      const { el } = crear({ lista: [] });

      expect(el.querySelectorAll('.contenido-card').length).toBe(0);
      expect(el.querySelector('.secciones-grid')).not.toBeNull();
    });

    it('mientras carga muestra el aviso y oculta la lista', () => {
      TestBed.configureTestingModule({ imports: [ContenidoInstitucionalComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const fixture = TestBed.createComponent(ContenidoInstitucionalComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando contenidos');
      expect(el.querySelector('.secciones-grid')).toBeNull();

      http.expectOne(POR_EMPRESA).flush([]);
    });

    it('si falla la carga avisa y quita el estado de carga', () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { componente, el } = crear({ fallar: true });

      expect(consola).toHaveBeenCalled();
      expect(componente.cargando).toBe(false);
      expect(avisos().some((t) => t.type === 'error' && t.message === 'Error al cargar contenidos')).toBe(true);
      expect(el.querySelector('.loading-state')).toBeNull();
    });
  });

  describe('crear sección', () => {
    it('el botón alterna entre "Nueva Sección" y "Cancelar" y muestra el formulario', () => {
      const { fixture, componente, el } = crear();
      const boton = el.querySelector<HTMLButtonElement>('.btn-nuevo')!;
      expect(boton.textContent).toContain('Nueva Sección');

      boton.click();
      fixture.detectChanges();
      expect(componente.mostrarFormularioNuevo).toBe(true);
      expect(el.querySelector('.card-nuevo h3')?.textContent).toContain('Crear Nueva Sección');
      expect(boton.textContent).toContain('Cancelar');

      boton.click();
      fixture.detectChanges();
      expect(el.querySelector('.card-nuevo')).toBeNull();
    });

    it('al abrir el formulario lo deja limpio aunque antes tuviera datos', () => {
      const { componente } = crear();
      componente.nuevaSeccion.titulo = 'Viejo';

      componente.toggleFormularioNuevo();

      expect(componente.nuevaSeccion).toEqual({ seccion: '', titulo: '', contenido: '', tituloEn: '', contenidoEn: '', publicado: true });
    });

    it('si faltan campos obligatorios avisa y no envía nada', () => {
      const { componente } = crear();
      componente.toggleFormularioNuevo();
      componente.nuevaSeccion.seccion = 'MISION';
      componente.nuevaSeccion.titulo = 'Misión';

      componente.guardarNuevaSeccion();

      http.expectNone(CONTENIDOS);
      expect(avisos().some((t) => t.type === 'info' && t.message.includes('campos obligatorios'))).toBe(true);
      expect(componente.cargandoCrear).toBe(false);
    });

    it('envía la sección con el identificador en mayúsculas y los textos recortados, y recarga', () => {
      const { componente } = crear();
      componente.toggleFormularioNuevo();
      componente.nuevaSeccion = { seccion: ' mision ', titulo: ' Misión ', contenido: ' Construir ', tituloEn: ' Mission ', contenidoEn: ' Build ', publicado: false };

      componente.guardarNuevaSeccion();
      expect(componente.cargandoCrear).toBe(true);
      const peticion = http.expectOne((r) => r.method === 'POST' && r.url === CONTENIDOS);
      expect(peticion.request.body).toEqual({
        empresaId: 1, seccion: 'MISION', titulo: 'Misión', contenido: 'Construir', tituloEn: 'Mission', contenidoEn: 'Build', publicado: false,
      });
      peticion.flush({ id: 5, titulo: 'Misión' });
      http.expectOne(POR_EMPRESA).flush([]);

      expect(componente.cargandoCrear).toBe(false);
      expect(componente.mostrarFormularioNuevo).toBe(false);
      expect(avisos().some((t) => t.type === 'success' && t.message === 'Sección "Misión" creada exitosamente.')).toBe(true);
    });

    it('el formulario se envía con el botón "Guardar Sección"', async () => {
      const { fixture, componente, el } = crear();
      componente.toggleFormularioNuevo();
      fixture.detectChanges();
      await fixture.whenStable();
      const poner = (id: string, valor: string) => {
        const campo = el.querySelector<HTMLInputElement>(`#${id}`)!;
        campo.value = valor;
        campo.dispatchEvent(new Event('input'));
      };
      poner('contenido-campo-1', 'vision2');
      poner('contenido-campo-2', 'Otra visión');
      poner('contenido-campo-3', 'Texto');
      await fixture.whenStable();

      el.querySelector<HTMLButtonElement>('.btn-guardar')!.click();

      const peticion = http.expectOne((r) => r.method === 'POST');
      expect(peticion.request.body.seccion).toBe('VISION2');
      peticion.flush({ id: 6, titulo: 'Otra visión' });
      http.expectOne(POR_EMPRESA).flush([]);
    });

    it('si el servidor rechaza la creación muestra su mensaje o uno genérico', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.toggleFormularioNuevo();
      componente.nuevaSeccion = { seccion: 'VISION', titulo: 'Visión', contenido: 'x', tituloEn: '', contenidoEn: '', publicado: true };

      componente.guardarNuevaSeccion();
      http.expectOne((r) => r.method === 'POST').flush({ message: 'Sección duplicada' }, { status: 409, statusText: 'Conflict' });
      expect(componente.cargandoCrear).toBe(false);
      expect(componente.mostrarFormularioNuevo).toBe(true);

      componente.guardarNuevaSeccion();
      http.expectOne((r) => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });

      const mensajes = avisos().filter((t) => t.type === 'error').map((t) => t.message);
      expect(mensajes[0]).toBe('Sección duplicada');
      expect(mensajes[1]).toContain('Verifica que no esté duplicada');
    });
  });

  describe('actualizar sección', () => {
    it('envía los cambios de la tarjeta (con los textos en inglés vacíos como cadena) y refresca la sección', () => {
      const { componente } = crear();
      const seccion = componente.secciones[0];
      seccion.contenido = 'Ser el referente';

      componente.guardarSeccion(seccion);
      const peticion = http.expectOne((r) => r.method === 'PUT' && r.url === `${CONTENIDOS}/1`);
      expect(peticion.request.body).toEqual({
        empresaId: 1, seccion: 'VISION', titulo: 'Nuestra Visión', contenido: 'Ser el referente', tituloEn: '', contenidoEn: '', publicado: true,
      });
      peticion.flush({ ...secciones[0], contenido: 'Ser el referente', actualizadoEn: '2026-10-22T08:00:00' });

      expect(seccion.actualizadoEn).toBe('2026-10-22T08:00:00');
      expect(avisos().some((t) => t.type === 'success' && t.message === 'Sección "Nuestra Visión" actualizada correctamente.')).toBe(true);
    });

    it('el botón Actualizar de la tarjeta dispara el guardado', () => {
      const { el } = crear();

      el.querySelectorAll('.contenido-card')[1].querySelector<HTMLButtonElement>('.btn-guardar')!.click();

      const peticion = http.expectOne((r) => r.method === 'PUT' && r.url === `${CONTENIDOS}/2`);
      expect(peticion.request.body.publicado).toBe(false);
      peticion.flush({ ...secciones[1] });
    });

    it('si falla avisa del error', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      componente.guardarSeccion(componente.secciones[0]);
      http.expectOne((r) => r.method === 'PUT').flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some((t) => t.type === 'error' && t.message === 'Error al actualizar los cambios.')).toBe(true);
    });

    it('una sección sin id no genera petición', () => {
      const { componente } = crear();

      componente.guardarSeccion({ empresaId: 1, seccion: 'X', titulo: 'X', contenido: 'x', publicado: true });

      http.expectNone((r) => r.method === 'PUT');
    });
  });

  describe('eliminar sección', () => {
    it('pide confirmación y, si se acepta, borra la sección y recarga', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarSeccion(componente.secciones[0]);
      expect(dialogo.config().title).toBe('Eliminar Sección');
      expect(dialogo.config().message).toContain('Nuestra Visión');
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${CONTENIDOS}/1`).flush(null);
      await pendiente;
      http.expectOne(POR_EMPRESA).flush([]);

      expect(avisos().some((t) => t.message === 'Sección "Nuestra Visión" eliminada correctamente.')).toBe(true);
    });

    it('el botón Eliminar de la tarjeta abre el diálogo', () => {
      const { el } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      el.querySelector<HTMLButtonElement>('.btn-eliminar')!.click();

      expect(dialogo.isOpen()).toBe(true);
      dialogo.cancel();
    });

    it('si se cancela o la sección no tiene id no borra nada', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      await componente.eliminarSeccion({ empresaId: 1, seccion: 'X', titulo: 'X', contenido: 'x', publicado: true });
      const pendiente = componente.eliminarSeccion(componente.secciones[0]);
      dialogo.cancel();
      await pendiente;

      http.expectNone((r) => r.method === 'DELETE');
    });

    it('si el borrado falla avisa del error', async () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarSeccion(componente.secciones[1]);
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await pendiente;

      expect(avisos().some((t) => t.type === 'error' && t.message === 'Error al intentar eliminar la sección.')).toBe(true);
    });
  });
});
