import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EtapasComponent } from './etapas.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Etapa } from '../../../core/models/etapa.models';
import { environment } from '../../../../environments/environment';

const ETAPAS = `${environment.apiUrl}/etapas`;
const PROYECTOS = `${environment.apiUrl}/proyectos`;

const etapas = [
  { id: 1, proyectoId: 1, proyectoNombre: 'El Encanto', nombre: 'Etapa 1', descripcion: 'Primera fase', orden: 1, activo: true, creadoEn: '2026-03-15T10:00:00' },
  { id: 2, proyectoId: 2, proyectoNombre: 'Solara', nombre: 'Etapa A', activo: false },
  { id: 3, nombre: 'Huérfana', activo: true } as unknown,
];
const proyectos = [{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }];

describe('EtapasComponent', () => {
  let http: HttpTestingController;

  function crear(opciones: { etapas?: unknown[]; fallar?: ('etapas' | 'proyectos')[] } = {}) {
    TestBed.configureTestingModule({
      imports: [EtapasComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(EtapasComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const error = { status: 500, statusText: 'Error' };
    const e = http.expectOne(ETAPAS);
    if (opciones.fallar?.includes('etapas')) e.flush(null, error);
    else e.flush(structuredClone(opciones.etapas ?? etapas) as object);
    const p = http.expectOne(PROYECTOS);
    if (opciones.fallar?.includes('proyectos')) p.flush(null, error);
    else p.flush(structuredClone(proyectos));
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
    it('muestra una tarjeta por etapa con su estado, proyecto, orden y fecha', () => {
      const { el } = crear();

      const tarjetas = el.querySelectorAll('.etapa-card');
      expect(tarjetas.length).toBe(3);
      expect(tarjetas[0].textContent).toContain('Etapa 1');
      expect(tarjetas[0].textContent).toContain('Activa');
      expect(tarjetas[0].textContent).toContain('El Encanto');
      expect(tarjetas[0].textContent).toContain('Primera fase');
      expect(tarjetas[0].textContent).toContain('2026-03-15');
      expect(tarjetas[0].querySelector('.badge')?.classList).toContain('badge-finalizada');
      expect(tarjetas[1].textContent).toContain('Inactiva');
      expect(tarjetas[1].querySelector('.badge')?.classList).toContain('badge-planificada');
      expect(tarjetas[1].textContent).toContain('Reciente'); // sin fecha de creación
      expect(tarjetas[1].textContent).toContain('1'); // orden por defecto
      expect(tarjetas[2].textContent).toContain('Sin asignación');
    });

    it('arma el filtro con los proyectos que tienen etapas, sin repetir y sin los que no tienen nombre', () => {
      const { componente, el } = crear();

      expect(componente.proyectosParaFiltro).toEqual([{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }]);
      const opciones = Array.from(el.querySelectorAll('.select-filtro option')).map((o) => o.textContent?.trim());
      expect(opciones).toEqual(['Todos los proyectos', 'El Encanto', 'Solara']);
    });

    it('toma el id y el nombre del proyecto anidado si no vienen planos', () => {
      const { componente } = crear({ etapas: [{ id: 9, nombre: 'X', proyecto: { id: 4, nombre: 'Anidado' } }] });

      expect(componente.etapas[0].proyectoId).toBe(4);
      expect(componente.etapas[0].proyecto?.nombre).toBe('Anidado');
      expect(componente.proyectosParaFiltro).toEqual([{ id: 4, nombre: 'Anidado' }]);
    });

    it('con id pero sin nombre muestra "Proyecto #id" y sin proyecto alguno, "Sin asignación"', () => {
      const { componente } = crear({ etapas: [{ id: 9, nombre: 'X', proyectoId: 7 }, { id: 10, nombre: 'Y' }] });

      expect(componente.etapas[0].proyecto?.nombre).toBe('Proyecto #7');
      expect(componente.etapas[1].proyecto?.nombre).toBe('Sin asignación');
    });

    it('filtrar por proyecto deja solo sus etapas y "Todos" las devuelve', async () => {
      const { fixture, componente, el } = crear();
      const select = el.querySelector<HTMLSelectElement>('.select-filtro')!;

      select.value = '2';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(componente.etapasFiltradas.map((x) => x.nombre)).toEqual(['Etapa A']);
      expect(el.querySelectorAll('.etapa-card').length).toBe(1);

      select.value = '';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(componente.etapasFiltradas.length).toBe(3);
    });

    it('si el filtro no coincide con nada muestra el mensaje de vacío', () => {
      const { fixture, componente, el } = crear();

      componente.filtroProyectoId = '999';
      fixture.detectChanges();

      expect(el.querySelector('.empty-card')?.textContent).toContain('No se encontraron etapas');
    });

    it('si falla la carga de etapas y proyectos avisa y no rompe la pantalla', () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { el, componente } = crear({ fallar: ['etapas', 'proyectos'] });

      const mensajes = avisos().map((t) => t.message);
      expect(mensajes).toContain('Error al cargar las etapas');
      expect(mensajes).toContain('Error al cargar proyectos');
      expect(consola).toHaveBeenCalledTimes(2);
      expect(componente.cargando).toBe(false);
      expect(el.querySelector('.empty-card')).not.toBeNull();
    });
  });

  describe('estado visual', () => {
    it('getBadgeClass distingue activa de inactiva o sin dato', () => {
      const { componente } = crear();

      expect(componente.getBadgeClass(true)).toBe('badge-finalizada');
      expect(componente.getBadgeClass(false)).toBe('badge-planificada');
      expect(componente.getBadgeClass()).toBe('badge-planificada');
    });
  });

  describe('crear', () => {
    it('"+ Nueva etapa" abre el formulario con el primer proyecto elegido y "Cancelar" lo cierra', () => {
      const { fixture, componente, el } = crear();

      el.querySelector<HTMLButtonElement>('.btn-nueva')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h2')?.textContent).toContain('Crear Nueva Etapa');
      expect(componente.esEdicion).toBe(false);
      expect(componente.nuevaEtapa.proyectoId).toBe(1);
      expect(componente.nuevaEtapa.orden).toBe(1);
      expect(el.querySelector('.btn-guardar')?.textContent).toContain('Guardar Etapa');

      el.querySelector<HTMLButtonElement>('.btn-cancelar')!.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
    });

    it('sin proyectos disponibles el formulario abre sin proyecto elegido', () => {
      TestBed.configureTestingModule({ imports: [EtapasComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const fixture = TestBed.createComponent(EtapasComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(ETAPAS).flush([]);
      http.expectOne(PROYECTOS).flush([]);

      fixture.componentInstance.abrirModalCrear();

      expect(fixture.componentInstance.nuevaEtapa.proyectoId).toBeNull();
    });

    it('la X cierra el formulario', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();

      el.querySelector<HTMLButtonElement>('.btn-close')!.click();

      expect(componente.mostrarModal).toBe(false);
    });

    it('no envía nada si falta el nombre o el proyecto', () => {
      const { componente } = crear();
      componente.abrirModalCrear();

      componente.guardarEtapa();
      componente.nuevaEtapa.nombre = 'Etapa 2';
      componente.nuevaEtapa.proyectoId = null;
      componente.guardarEtapa();

      http.expectNone(ETAPAS);
      expect(componente.guardando).toBe(false);
    });

    it('crea la etapa con los números convertidos y la descripción vacía como ausente', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.nuevaEtapa.nombre = 'Etapa 2';
      componente.nuevaEtapa.nombreEn = 'Stage 2';
      componente.nuevaEtapa.proyectoId = '2' as unknown as number;
      componente.nuevaEtapa.orden = '3' as unknown as number;
      componente.nuevaEtapa.activo = false;

      componente.guardarEtapa();
      expect(componente.guardando).toBe(true);
      const peticion = http.expectOne((r) => r.method === 'POST' && r.url === ETAPAS);
      expect(peticion.request.body).toEqual({
        proyectoId: 2, nombre: 'Etapa 2', descripcion: undefined, nombreEn: 'Stage 2', descripcionEn: '', orden: 3, activo: false,
      });
      peticion.flush({ id: 10 });
      http.expectOne(ETAPAS).flush([]);

      expect(componente.mostrarModal).toBe(false);
      expect(componente.guardando).toBe(false);
      expect(avisos().some((t) => t.type === 'success' && t.message === 'Etapa creada correctamente')).toBe(true);
    });

    it('un orden inválido se guarda como 1', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.nuevaEtapa.nombre = 'Etapa 2';
      componente.nuevaEtapa.orden = 0;

      componente.guardarEtapa();

      const peticion = http.expectOne((r) => r.method === 'POST');
      expect(peticion.request.body.orden).toBe(1);
      peticion.flush({ id: 1 });
      http.expectOne(ETAPAS).flush([]);
    });

    it('si crear falla avisa, deja de guardar y mantiene el formulario abierto', () => {
      const { componente } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalCrear();
      componente.nuevaEtapa.nombre = 'Etapa 2';

      componente.guardarEtapa();
      http.expectOne((r) => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });

      expect(componente.guardando).toBe(false);
      expect(componente.mostrarModal).toBe(true);
      expect(consola).toHaveBeenCalled();
      expect(avisos().some((t) => t.message === 'Error al crear la etapa')).toBe(true);
    });

    it('permite llenar el nombre escribiendo y guardar con el botón', async () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();
      await fixture.whenStable();
      const boton = el.querySelector<HTMLButtonElement>('.btn-guardar')!;
      fixture.detectChanges();
      expect(boton.disabled).toBe(true);

      const campo = el.querySelector<HTMLInputElement>('#nombre')!;
      campo.value = 'Etapa Nueva';
      campo.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(boton.disabled).toBe(false);
      boton.click();

      const peticion = http.expectOne((r) => r.method === 'POST');
      expect(peticion.request.body.nombre).toBe('Etapa Nueva');
      peticion.flush({ id: 1 });
      http.expectOne(ETAPAS).flush([]);
    });
  });

  describe('editar', () => {
    it('abre el formulario con los datos de la etapa', () => {
      const { fixture, componente, el } = crear();

      el.querySelector<HTMLButtonElement>('.btn-editar')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h2')?.textContent).toContain('Editar Etapa');
      expect(componente.esEdicion).toBe(true);
      expect(componente.etapaEditandoId).toBe(1);
      expect(componente.nuevaEtapa).toMatchObject({ nombre: 'Etapa 1', descripcion: 'Primera fase', orden: 1, activo: true, proyectoId: 1 });
      expect(el.querySelector('.btn-guardar')?.textContent).toContain('Actualizar');
    });

    it('completa los valores vacíos con los predeterminados', () => {
      const { componente } = crear();

      componente.abrirModalEditar({ id: 8, nombre: 'Sin datos', proyectoId: 0 } as Etapa);

      expect(componente.nuevaEtapa).toEqual({
        nombre: 'Sin datos', nombreEn: '', descripcion: '', descripcionEn: '', orden: 1, activo: true, proyectoId: null,
      });
    });

    it('sin id no abre el formulario', () => {
      const { componente } = crear();

      componente.abrirModalEditar({ nombre: 'X', proyectoId: 1 });

      expect(componente.mostrarModal).toBe(false);
    });

    it('actualiza con PUT, avisa, cierra y recarga', () => {
      const { componente } = crear();
      componente.abrirModalEditar(componente.etapas[0]);
      componente.nuevaEtapa.nombre = 'Etapa 1 renovada';

      componente.guardarEtapa();
      const peticion = http.expectOne((r) => r.method === 'PUT' && r.url === `${ETAPAS}/1`);
      expect(peticion.request.body.nombre).toBe('Etapa 1 renovada');
      peticion.flush({ id: 1 });
      http.expectOne(ETAPAS).flush([]);

      expect(componente.mostrarModal).toBe(false);
      expect(avisos().some((t) => t.message === 'Etapa actualizada correctamente')).toBe(true);
    });

    it('si actualizar falla avisa y deja el formulario abierto', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalEditar(componente.etapas[0]);

      componente.guardarEtapa();
      http.expectOne((r) => r.method === 'PUT').flush(null, { status: 500, statusText: 'Error' });

      expect(componente.guardando).toBe(false);
      expect(componente.mostrarModal).toBe(true);
      expect(avisos().some((t) => t.message === 'Error al actualizar la etapa')).toBe(true);
    });
  });

  describe('eliminar', () => {
    it('pide confirmación y, si se acepta, borra la etapa y recarga', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarEtapa(componente.etapas[0]);
      expect(dialogo.config().title).toBe('Eliminar Etapa');
      expect(dialogo.config().message).toContain('Etapa 1');
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${ETAPAS}/1`).flush(null);
      await pendiente;
      http.expectOne(ETAPAS).flush([]);

      expect(avisos().some((t) => t.message === 'Etapa eliminada correctamente')).toBe(true);
    });

    it('el botón Eliminar de la tarjeta abre el diálogo', () => {
      const { el } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      el.querySelector<HTMLButtonElement>('.btn-eliminar')!.click();

      expect(dialogo.isOpen()).toBe(true);
      dialogo.cancel();
    });

    it('si se cancela o la etapa no tiene id no borra nada', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      await componente.eliminarEtapa({ nombre: 'X', proyectoId: 1 });
      const pendiente = componente.eliminarEtapa(componente.etapas[0]);
      dialogo.cancel();
      await pendiente;

      http.expectNone((r) => r.method === 'DELETE');
    });

    it('si el servidor rechaza el borrado muestra su mensaje o uno genérico', async () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const primero = componente.eliminarEtapa(componente.etapas[0]);
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE').flush({ mensaje: 'Tiene lotes asociados' }, { status: 409, statusText: 'Conflict' });
      await primero;

      const segundo = componente.eliminarEtapa(componente.etapas[1]);
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await segundo;

      const mensajes = avisos().filter((t) => t.type === 'error').map((t) => t.message);
      expect(mensajes).toContain('Tiene lotes asociados');
      expect(mensajes).toContain('Error al eliminar la etapa');
    });
  });
});
