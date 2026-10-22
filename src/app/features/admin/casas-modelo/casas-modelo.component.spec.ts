import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CasasModeloComponent } from './casas-modelo.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

const CASAS = `${environment.apiUrl}/casas-modelo`;
const MULTIMEDIA = `${environment.apiUrl}/multimedia`;

const casas = [
  { id: 5, proyectoId: 1, proyectoNombre: 'El Encanto', nombre: 'Villa Samán', descripcion: 'Dos niveles', areaConstruidaM2: 293, numeroHabitaciones: 3, numeroBanos: 4, publicado: true, activo: true },
  { id: 6, proyectoId: 1, nombre: 'Villa Colibrí', publicado: false, activo: true },
];

describe('CasasModeloComponent', () => {
  let http: HttpTestingController;

  function crear(lista: unknown[] = casas) {
    TestBed.configureTestingModule({
      imports: [CasasModeloComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CasasModeloComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(CASAS).flush(structuredClone(lista));
    http.expectOne(`${environment.apiUrl}/proyectos`).flush([{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }]);
    fixture.detectChanges();
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, refrescar };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  describe('lista', () => {
    it('muestra una tarjeta por tipología con su proyecto, estado y datos', () => {
      const { el } = crear();

      const tarjetas = el.querySelectorAll('.card-item');
      expect(tarjetas.length).toBe(2);
      expect(tarjetas[0].textContent).toContain('Villa Samán');
      expect(tarjetas[0].textContent).toContain('El Encanto');
      expect(tarjetas[0].textContent).toContain('Publicado');
      expect(tarjetas[0].textContent).toContain('293 m²');
      expect(tarjetas[1].textContent).toContain('Borrador');
      expect(tarjetas[1].textContent).toContain('Proyecto #1');
      expect(tarjetas[1].textContent).toContain('Sin descripción disponible');
      expect(tarjetas[1].textContent).toContain('N/D');
    });

    it('si falla la carga de tipologías o de proyectos lo deja en la consola sin romper la pantalla', () => {
      TestBed.configureTestingModule({ imports: [CasasModeloComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(CasasModeloComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();

      http.expectOne(CASAS).flush(null, { status: 500, statusText: 'Error' });
      http.expectOne(`${environment.apiUrl}/proyectos`).flush(null, { status: 500, statusText: 'Error' });

      expect(consola).toHaveBeenCalledTimes(2);
      expect(fixture.componentInstance.listaCasas).toEqual([]);
    });
  });

  describe('crear', () => {
    it('"+ Nueva tipología" abre el formulario con el primer proyecto elegido y "Cancelar" lo cierra', () => {
      const { el, fixture, componente } = crear();

      el.querySelector<HTMLButtonElement>('.btn-primary')?.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h3')?.textContent).toContain('Nueva tipología');
      expect(componente.casaActual.proyectoId).toBe(1);
      expect(el.textContent).toContain('Imágenes de la tipología (renders)');

      el.querySelector<HTMLButtonElement>('.btn-secondary')?.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
    });

    it('al crear una tipología nueva ya se pueden agregar renders y planos', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();

      expect(el.textContent).toContain('Imágenes de la tipología (renders)');
      expect(el.textContent).toContain('Planos');
      expect(el.textContent).not.toContain('Guarda la tipología para poder subir');
    });

    it('al guardar, los renders y planos subidos quedan asociados a la tipología creada', () => {
      const { fixture, componente } = crear();
      componente.abrirModalCrear();
      componente.casaActual.nombre = 'Casa Tipo A';
      componente.imagenesNuevas = [{ url: 'render.jpg', nombre: 'render.jpg' }];
      componente.planosNuevos = [{ url: 'plano.pdf', nombre: 'plano.pdf' }];
      fixture.detectChanges();

      componente.guardarCasa();
      expect(componente.guardando).toBe(true);
      http.expectOne(r => r.method === 'POST' && r.url === CASAS).flush({ id: 55, nombre: 'Casa Tipo A' });

      const render = http.expectOne(MULTIMEDIA);
      expect(render.request.body).toMatchObject({ casaModeloId: 55, tipo: 'IMAGEN', url: 'render.jpg', portada: true });
      render.flush({ id: 1 });
      const plano = http.expectOne(MULTIMEDIA);
      expect(plano.request.body).toMatchObject({ casaModeloId: 55, tipo: 'PLANO', url: 'plano.pdf' });
      plano.flush({ id: 2 });

      http.expectOne(CASAS).flush([]); // recarga del listado
      expect(componente.modalAbierto).toBe(false);
      expect(componente.guardando).toBe(false);
      expect(avisos().some(t => t.message.includes('creada correctamente'))).toBe(true);
    });

    it('sin archivos no llama a multimedia y recarga la lista', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.casaActual.nombre = 'Villa Nueva';

      componente.guardarCasa();
      http.expectOne(r => r.method === 'POST' && r.url === CASAS).flush({ id: 77, nombre: 'Villa Nueva' });

      http.expectNone(MULTIMEDIA);
      http.expectOne(CASAS).flush([]);
      expect(componente.modalAbierto).toBe(false);
    });

    it('si un archivo no se puede asociar, la tipología se crea igual y avisa cuántos faltaron', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.casaActual.nombre = 'Villa Nueva';
      componente.imagenesNuevas = [{ url: 'a.jpg', nombre: 'a.jpg' }, { url: 'b.jpg', nombre: 'b.jpg' }];

      componente.guardarCasa();
      http.expectOne(r => r.method === 'POST' && r.url === CASAS).flush({ id: 77, nombre: 'Villa Nueva' });
      http.expectOne(MULTIMEDIA).flush(null, { status: 500, statusText: 'Error' });
      http.expectOne(MULTIMEDIA).flush({ id: 2 });
      http.expectOne(CASAS).flush([]);

      expect(avisos().some(t => t.type === 'error' && t.message.includes('1 archivo(s)'))).toBe(true);
    });

    it('si crear falla avisa, deja de guardar y mantiene el formulario abierto', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalCrear();

      componente.guardarCasa();
      http.expectOne(r => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });

      expect(componente.guardando).toBe(false);
      expect(componente.modalAbierto).toBe(true);
      expect(avisos().some(t => t.message.includes('No se pudo crear'))).toBe(true);
    });
  });

  describe('editar', () => {
    it('abre la tipología con sus renders y planos separados por tipo y ordenados', () => {
      const { el, fixture, componente } = crear();

      el.querySelector<HTMLButtonElement>('.btn-action.edit')?.click();
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([
        { id: 12, tipo: 'PLANO', url: 'p1.png', titulo: 'Planta 1', orden: 1 },
        { id: 11, tipo: 'IMAGEN', url: 'r2.jpg', orden: 2 },
        { id: 10, tipo: 'IMAGEN', url: 'r1.jpg', orden: 1 },
      ]);
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h3')?.textContent).toContain('Editar tipología');
      expect(componente.imagenes.map(i => i.id)).toEqual([10, 11]);
      expect(componente.planos.map(p => p.id)).toEqual([12]);
      expect(el.querySelectorAll('.miniaturas li').length).toBe(3);
    });

    it('si no cargan los archivos avisa', () => {
      const { componente } = crear();

      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some(t => t.message.includes('No se pudieron cargar las imágenes'))).toBe(true);
    });

    it('al actualizar guarda los cambios, recarga la lista y cierra', () => {
      const { componente } = crear();
      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([]);
      componente.casaActual.nombre = 'Villa Samán II';

      componente.guardarCasa();
      const peticion = http.expectOne(r => r.method === 'PUT' && r.url === `${CASAS}/5`);
      expect(peticion.request.body.nombre).toBe('Villa Samán II');
      peticion.flush({ id: 5 });
      http.expectOne(CASAS).flush([]);

      expect(componente.modalAbierto).toBe(false);
    });

    it('si actualizar falla lo deja en la consola', () => {
      const { componente } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([]);

      componente.guardarCasa();
      http.expectOne(r => r.method === 'PUT').flush(null, { status: 500, statusText: 'Error' });

      expect(consola).toHaveBeenCalled();
    });

    it('agrega un render a una tipología ya creada: la portada es el primero y los siguientes siguen en orden', () => {
      const { componente } = crear();
      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([]);

      componente.agregarArchivo('IMAGEN', { url: 'r1.jpg', nombre: 'Fachada.jpg' });
      const primero = http.expectOne(MULTIMEDIA);
      expect(primero.request.body).toMatchObject({ casaModeloId: 5, tipo: 'IMAGEN', titulo: 'Fachada', orden: 1, portada: true });
      primero.flush({ id: 20, tipo: 'IMAGEN', orden: 1, url: 'r1.jpg' });

      componente.agregarArchivo('IMAGEN', { url: 'r2.jpg', nombre: 'Sala.jpg' });
      const segundo = http.expectOne(MULTIMEDIA);
      expect(segundo.request.body).toMatchObject({ orden: 2, portada: false });
      segundo.flush({ id: 21, tipo: 'IMAGEN', orden: 2, url: 'r2.jpg' });

      componente.agregarArchivo('PLANO', { url: 'p.pdf', nombre: 'Planta.pdf' });
      http.expectOne(MULTIMEDIA).flush({ id: 22, tipo: 'PLANO', orden: 1, url: 'p.pdf' });

      expect(componente.imagenes.length).toBe(2);
      expect(componente.planos.length).toBe(1);
    });

    it('si el archivo se subió pero no se pudo asociar, avisa', () => {
      const { componente } = crear();
      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([]);

      componente.agregarArchivo('IMAGEN', { url: 'r1.jpg', nombre: 'a.jpg' });
      http.expectOne(MULTIMEDIA).flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some(t => t.message.includes('no se pudo asociar'))).toBe(true);
      expect(componente.imagenes.length).toBe(0);
    });

    it('agregar un archivo sin tipología guardada no hace nada', () => {
      const { componente } = crear();
      componente.abrirModalCrear();

      componente.agregarArchivo('IMAGEN', { url: 'r1.jpg', nombre: 'a.jpg' });

      http.expectNone(MULTIMEDIA);
    });

    it('quitar un archivo pide confirmación y lo borra', async () => {
      const { componente } = crear();
      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([{ id: 10, tipo: 'IMAGEN', url: 'r1.jpg', orden: 1 }, { id: 12, tipo: 'PLANO', url: 'p.png', orden: 1 }]);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.quitarArchivo(componente.imagenes[0]);
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(r => r.method === 'DELETE' && r.url === `${MULTIMEDIA}/10`).flush(null);
      await pendiente;

      expect(componente.imagenes.length).toBe(0);
      expect(componente.planos.length).toBe(1);
    });

    it('si se cancela o falla al quitar un archivo, no lo pierde o avisa', async () => {
      const { componente } = crear();
      componente.abrirModalEditar(casas[0] as never);
      http.expectOne(`${MULTIMEDIA}/casaModelo/5`).flush([{ id: 10, tipo: 'IMAGEN', url: 'r1.jpg', orden: 1 }]);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const cancelada = componente.quitarArchivo(componente.imagenes[0]);
      dialogo.cancel();
      await cancelada;
      http.expectNone(r => r.method === 'DELETE');

      const fallida = componente.quitarArchivo(componente.imagenes[0]);
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(r => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await fallida;

      expect(componente.imagenes.length).toBe(1);
      expect(avisos().some(t => t.message.includes('No se pudo quitar'))).toBe(true);

      await componente.quitarArchivo({ tipo: 'IMAGEN', url: 'x', portada: false, publicado: true, activo: true }); // sin id: no hace nada
      http.expectNone(r => r.method === 'DELETE');
    });
  });

  describe('eliminar', () => {
    it('pide confirmación y borra la tipología', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarCasa(5);
      expect(dialogo.config().title).toBe('Eliminar tipología');
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(r => r.method === 'DELETE' && r.url === `${CASAS}/5`).flush(null);
      await pendiente;
      http.expectOne(CASAS).flush([]);
    });

    it('sin id o con la confirmación cancelada no borra nada', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      await componente.eliminarCasa(undefined);
      const pendiente = componente.eliminarCasa(5);
      dialogo.cancel();
      await pendiente;

      http.expectNone(r => r.method === 'DELETE');
    });

    it('si falla lo deja en la consola', async () => {
      const { componente } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarCasa(5);
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(r => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await pendiente;

      expect(consola).toHaveBeenCalled();
    });
  });
});
