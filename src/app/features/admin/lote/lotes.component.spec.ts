import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LotesComponent } from './lotes.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Lote } from '../../../core/models/lote.models';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;
const LOTES = `${API}/lotes`;
const PROYECTOS = `${API}/proyectos`;
const ETAPAS = `${API}/etapas`;

const lotes = [
  { id: 1, codigo: 'LT-104', areaM2: 420, estadoId: 1, activo: true, proyectoNombre: 'El Encanto', etapaId: 10 },
  { id: 2, codigo: 'LT-205', areaM2: 300, estadoId: 2, activo: false, etapaId: 11 },
  { id: 3, codigo: 'XX-1', areaM2: 100, etapaId: 12 }, // sin estado ni activo: se completan por defecto
  { id: 4, codigo: 'YY-2', areaM2: 150, estadoId: 3, activo: true, etapaId: 13 },
  { id: 5, codigo: 'ZZ-3', areaM2: 90, estadoId: 1, activo: true, etapaId: 99 },
  { id: 6, codigo: 'WW-4', areaM2: 80, estadoId: 1, activo: true, etapaId: 14 },
  { id: 7, codigo: 'VV-5', areaM2: 70, estadoId: 1, activo: true },
];
const proyectos = [{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }];
const etapas = [
  { id: 10, nombre: 'Etapa 1', proyecto: { id: 1, nombre: 'El Encanto' } },
  { id: 11, nombre: 'Etapa 2', proyecto: { id: 2, nombre: 'Solara' } },
  { id: 12, nombre: 'Etapa 3', proyectoId: 3, proyectoNombre: 'Aurora' },
  { id: 13, nombre: 'Etapa 4', proyectoId: 1 },
  { id: 14, nombre: 'Etapa 5', proyectoId: 77 },
];

describe('LotesComponent', () => {
  let http: HttpTestingController;

  function crear(opciones: { lotes?: unknown[]; fallar?: ('lotes' | 'proyectos' | 'etapas')[] } = {}) {
    TestBed.configureTestingModule({
      imports: [LotesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(LotesComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const error = { status: 500, statusText: 'Error' };
    const responder = (clave: 'lotes' | 'proyectos' | 'etapas', url: string, datos: unknown) => {
      const p = http.expectOne(url);
      if (opciones.fallar?.includes(clave)) p.flush(null, error);
      else p.flush(structuredClone(datos) as object);
    };
    responder('lotes', LOTES, opciones.lotes ?? lotes);
    responder('proyectos', PROYECTOS, proyectos);
    responder('etapas', ETAPAS, etapas);
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
    it('muestra una fila por lote con su código, proyecto y área', () => {
      const { el } = crear();

      const filas = el.querySelectorAll('tbody tr');
      expect(filas.length).toBe(7);
      expect(filas[0].textContent).toContain('LT-104');
      expect(filas[0].textContent).toContain('El Encanto');
      expect(filas[0].textContent).toContain('420 m²');
      expect(el.querySelector('.empty-message')).toBeNull();
    });

    it('completa estado y activo por defecto cuando el servidor no los envía', () => {
      const { componente } = crear();

      const sinDatos = componente.lotes.find((l) => l.id === 3)!;
      expect(sinDatos.estadoId).toBe(1);
      expect(sinDatos.activo).toBe(true);
      expect(componente.cargando).toBe(false);
    });

    it('si falla la carga de lotes, proyectos y etapas avisa tres veces y deja la tabla vacía', () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { el, componente } = crear({ fallar: ['lotes', 'proyectos', 'etapas'] });

      const mensajes = avisos().map((t) => t.message);
      expect(mensajes).toContain('Error al cargar los lotes');
      expect(mensajes).toContain('Error al cargar proyectos');
      expect(mensajes).toContain('Error al cargar etapas');
      expect(consola).toHaveBeenCalledTimes(3);
      expect(componente.cargando).toBe(false);
      expect(el.querySelector('.empty-message')?.textContent).toContain('No se encontraron lotes');
    });

    it('con una lista vacía muestra el mensaje de que no hay lotes', () => {
      const { el } = crear({ lotes: [] });

      expect(el.querySelectorAll('tbody tr').length).toBe(1);
      expect(el.querySelector('.empty-message')).not.toBeNull();
    });
  });

  describe('nombre del proyecto', () => {
    it('toma el nombre del lote, o el de su etapa, o busca el proyecto por id', () => {
      const { componente } = crear();
      const por = (id: number) => componente.obtenerNombreProyecto(componente.lotes.find((l) => l.id === id)!);

      expect(por(1)).toBe('El Encanto'); // el propio lote
      expect(por(2)).toBe('Solara'); // etapa.proyecto.nombre
      expect(por(3)).toBe('Aurora'); // etapa.proyectoNombre
      expect(por(4)).toBe('El Encanto'); // etapa.proyectoId buscado en proyectos
    });

    it('devuelve "Sin proyecto" si no hay etapa, la etapa no existe o su proyecto no se conoce', () => {
      const { componente } = crear();
      const por = (id: number) => componente.obtenerNombreProyecto(componente.lotes.find((l) => l.id === id)!);

      expect(por(5)).toBe('Sin proyecto');
      expect(por(6)).toBe('Sin proyecto');
      expect(por(7)).toBe('Sin proyecto');
    });
  });

  describe('filtros', () => {
    function escribir(el: HTMLElement, id: string, texto: string) {
      const campo = el.querySelector<HTMLInputElement>(`#${id}`)!;
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
    }

    it('filtra por código sin distinguir mayúsculas ni espacios sobrantes', async () => {
      const { fixture, componente, el } = crear();

      escribir(el, 'filtroCodigo', ' lt-1 ');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(componente.lotesFiltrados.map((l) => l.codigo)).toEqual(['LT-104']);
      expect(el.querySelectorAll('tbody tr').length).toBe(1);
    });

    it('filtra por nombre de proyecto', async () => {
      const { fixture, componente, el } = crear();

      escribir(el, 'filtroProyecto', 'solara');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(componente.lotesFiltrados.map((l) => l.codigo)).toEqual(['LT-205']);
    });

    it('filtra por activos e inactivos y "Todos" los muestra de nuevo', async () => {
      const { fixture, componente, el } = crear();
      const select = el.querySelector<HTMLSelectElement>('#filtroActivo')!;

      select.value = select.options[2].value; // Inactivos
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(componente.lotesFiltrados.map((l) => l.codigo)).toEqual(['LT-205']);

      select.value = select.options[1].value; // Activos
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(componente.lotesFiltrados.length).toBe(6);

      select.value = select.options[0].value; // Todos
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(componente.lotesFiltrados.length).toBe(7);
    });

    it('si nada coincide muestra el mensaje de sin resultados', async () => {
      const { fixture, el } = crear();

      escribir(el, 'filtroCodigo', 'no-existe');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelector('.empty-message')?.textContent).toContain('No se encontraron lotes');
    });
  });

  describe('formulario de proyecto y etapa', () => {
    it('al cambiar de proyecto solo ofrece las etapas de ese proyecto y limpia la etapa elegida', () => {
      const { componente } = crear();
      componente.nuevoLote.etapaId = 10;

      componente.nuevoLote.proyectoId = 1;
      componente.alCambiarProyecto();

      expect(componente.nuevoLote.etapaId).toBeNull();
      expect(componente.etapasFiltradas.map((e) => e.id)).toEqual([10, 13]);
    });

    it('al quitar el proyecto vuelve a ofrecer todas las etapas', () => {
      const { componente } = crear();
      componente.nuevoLote.proyectoId = 2;
      componente.alCambiarProyecto();
      expect(componente.etapasFiltradas.length).toBe(1);

      componente.nuevoLote.proyectoId = null;
      componente.alCambiarProyecto();

      expect(componente.etapasFiltradas.length).toBe(5);
    });

    it('avisa en el formulario si el proyecto elegido no tiene etapas', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      componente.nuevoLote.proyectoId = 55;
      componente.alCambiarProyecto();
      fixture.detectChanges();

      expect(el.querySelector('small')?.textContent).toContain('No hay etapas creadas en este proyecto');
    });
  });

  describe('crear', () => {
    it('"+ Nuevo" abre el formulario vacío y "Cancelar" lo cierra', () => {
      const { fixture, componente, el } = crear();

      el.querySelector<HTMLButtonElement>('.btn-nuevo')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h2')?.textContent).toContain('Crear Nuevo Lote');
      expect(componente.nuevoLote.id).toBeNull();
      expect(componente.nuevoLote.estadoId).toBe(1);
      expect(componente.etapasFiltradas.length).toBe(etapas.length); // sin proyecto elegido se ofrecen todas las etapas
      expect(el.querySelector('.btn-guardar')?.textContent).toContain('Guardar Lote');

      el.querySelector<HTMLButtonElement>('.btn-cancelar')!.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
    });

    it('el select de etapa no depende de haber elegido proyecto: muestra todas, con el proyecto al lado', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();

      const select = el.querySelector<HTMLSelectElement>('#etapaId')!;
      expect(select.disabled).toBe(false);
      const opciones = Array.from(select.options).map((o) => o.textContent?.replace(/\s+/g, ' ').trim());
      expect(opciones).toContain('El Encanto · Etapa 1');
      expect(opciones).toContain('Solara · Etapa 2');
      expect(opciones).toContain('Aurora · Etapa 3');
    });

    it('al elegir una etapa sin proyecto, el proyecto se completa con el de la etapa y la lista se acota', () => {
      const { componente } = crear();
      componente.abrirModalCrear();

      componente.nuevoLote.etapaId = 11;
      componente.alCambiarEtapa();

      expect(componente.nuevoLote.proyectoId).toBe(2);
      expect(componente.etapasFiltradas.map((e) => e.id)).toEqual([11]);
    });

    it('elegir etapa con proyecto ya elegido, sin etapa o con una etapa desconocida no cambia nada', () => {
      const { componente } = crear();
      componente.abrirModalCrear();

      componente.nuevoLote.proyectoId = 1;
      componente.nuevoLote.etapaId = 10;
      componente.alCambiarEtapa();
      expect(componente.nuevoLote.proyectoId).toBe(1);

      componente.nuevoLote.proyectoId = null;
      componente.nuevoLote.etapaId = null;
      componente.alCambiarEtapa();
      expect(componente.nuevoLote.proyectoId).toBeNull();

      componente.nuevoLote.etapaId = 12345;
      componente.alCambiarEtapa();
      expect(componente.nuevoLote.proyectoId).toBeNull();
    });

    it('la X del formulario también lo cierra', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();

      el.querySelector<HTMLButtonElement>('.btn-close')!.click();
      fixture.detectChanges();

      expect(componente.mostrarModal).toBe(false);
    });

    it('el botón Guardar está deshabilitado mientras el formulario es inválido', async () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelector<HTMLButtonElement>('.btn-guardar')!.disabled).toBe(true);
    });

    it('no envía nada si falta el código, el área o la etapa', () => {
      const { componente } = crear();
      componente.abrirModalCrear();

      componente.guardarLote();
      componente.nuevoLote.codigo = 'L-01';
      componente.guardarLote();
      componente.nuevoLote.areaM2 = 400;
      componente.guardarLote();

      http.expectNone(LOTES);
      expect(componente.guardando).toBe(false);
    });

    it('crea el lote con los números convertidos, cierra el formulario y recarga la lista', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.nuevoLote.codigo = 'L-01';
      componente.nuevoLote.nombre = 'Esquinero';
      componente.nuevoLote.areaM2 = '420' as unknown as number;
      componente.nuevoLote.etapaId = '10' as unknown as number;
      componente.nuevoLote.estadoId = '2' as unknown as number;
      componente.nuevoLote.descripcion = 'Terreno plano';
      componente.nuevoLote.descripcionEn = 'Flat land';

      componente.guardarLote();
      expect(componente.guardando).toBe(true);
      const peticion = http.expectOne((r) => r.method === 'POST' && r.url === LOTES);
      expect(peticion.request.body).toEqual({
        codigo: 'L-01', nombre: 'Esquinero', areaM2: 420, descripcion: 'Terreno plano', descripcionEn: 'Flat land',
        etapaId: 10, estadoId: 2, activo: true, publicado: true,
      });
      peticion.flush({ id: 90 });
      http.expectOne(LOTES).flush([]);

      expect(componente.guardando).toBe(false);
      expect(componente.mostrarModal).toBe(false);
      expect(avisos().some((t) => t.type === 'success' && t.message === 'Lote creado exitosamente')).toBe(true);
      expect(componente.lotesFiltrados).toEqual([]);
    });

    it('si crear falla avisa, deja de guardar y mantiene el formulario abierto', () => {
      const { componente } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalCrear();
      componente.nuevoLote.codigo = 'L-01';
      componente.nuevoLote.areaM2 = 400;
      componente.nuevoLote.etapaId = 10;

      componente.guardarLote();
      http.expectOne((r) => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });

      expect(componente.guardando).toBe(false);
      expect(componente.mostrarModal).toBe(true);
      expect(consola).toHaveBeenCalled();
      expect(avisos().some((t) => t.type === 'error' && t.message === 'Error al crear el lote')).toBe(true);
    });

    it('permite llenar el formulario escribiendo y guardarlo con el botón', async () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();
      await fixture.whenStable();

      const poner = (id: string, valor: string) => {
        const campo = el.querySelector<HTMLInputElement>(`#${id}`)!;
        campo.value = valor;
        campo.dispatchEvent(new Event('input'));
      };
      poner('codigo', 'L-77');
      poner('areaM2', '250');
      componente.nuevoLote.etapaId = 10; // el select de etapa depende del proyecto elegido
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const boton = el.querySelector<HTMLButtonElement>('.btn-guardar')!;
      expect(boton.disabled).toBe(false);
      boton.click();

      const peticion = http.expectOne((r) => r.method === 'POST' && r.url === LOTES);
      expect(peticion.request.body.codigo).toBe('L-77');
      expect(peticion.request.body.areaM2).toBe(250);
      peticion.flush({ id: 1 });
      http.expectOne(LOTES).flush([]);
    });
  });

  describe('editar', () => {
    it('abre el formulario con los datos del lote y las etapas de su proyecto', () => {
      const { fixture, componente, el } = crear();

      el.querySelector<HTMLButtonElement>('.btn-editar')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h2')?.textContent).toContain('Editar Lote');
      expect(componente.nuevoLote).toMatchObject({ id: 1, codigo: 'LT-104', areaM2: 420, proyectoId: 1, etapaId: 10, estadoId: 1 });
      expect(componente.etapasFiltradas.map((e) => e.id)).toEqual([10, 13]);
      expect(el.querySelector('.btn-guardar')?.textContent).toContain('Actualizar Lote');
    });

    it('si el lote no tiene etapa conocida deja el proyecto vacío y ofrece todas las etapas', () => {
      const { componente } = crear();

      componente.editarLote({ id: 7, codigo: 'VV-5', areaM2: 70, estadoId: 0, activo: true } as Lote);

      expect(componente.nuevoLote.proyectoId).toBeNull();
      expect(componente.nuevoLote.etapaId).toBeNull();
      expect(componente.nuevoLote.estadoId).toBe(1);
      expect(componente.nuevoLote.nombre).toBe('');
      expect(componente.etapasFiltradas.length).toBe(5);
    });

    it('si la etapa del lote no existe en la lista no inventa proyecto', () => {
      const { componente } = crear();

      componente.editarLote({ id: 5, codigo: 'ZZ-3', areaM2: 90, estadoId: 1, activo: true, etapaId: 99 } as Lote);

      expect(componente.nuevoLote.proyectoId).toBeNull();
      expect(componente.nuevoLote.etapaId).toBe(99);
    });

    it('actualiza el lote con PUT, avisa, cierra y recarga', () => {
      const { componente } = crear();
      componente.editarLote(componente.lotes[0]);
      componente.nuevoLote.areaM2 = 500;

      componente.guardarLote();
      const peticion = http.expectOne((r) => r.method === 'PUT' && r.url === `${LOTES}/1`);
      expect(peticion.request.body.areaM2).toBe(500);
      peticion.flush({ id: 1 });
      http.expectOne(LOTES).flush([]);

      expect(componente.mostrarModal).toBe(false);
      expect(avisos().some((t) => t.message === 'Lote actualizado exitosamente')).toBe(true);
    });

    it('si actualizar falla avisa y deja el formulario abierto', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.editarLote(componente.lotes[0]);

      componente.guardarLote();
      http.expectOne((r) => r.method === 'PUT').flush(null, { status: 500, statusText: 'Error' });

      expect(componente.guardando).toBe(false);
      expect(componente.mostrarModal).toBe(true);
      expect(avisos().some((t) => t.message === 'Error al actualizar el lote')).toBe(true);
    });
  });

  describe('estado y visibilidad', () => {
    it('cambiar el estado envía el id numérico y avisa', () => {
      const { componente } = crear();
      const lote = componente.lotes[0];
      lote.estadoId = '3' as unknown as number;

      componente.actualizarEstado(lote);
      const peticion = http.expectOne((r) => r.method === 'PATCH' && r.url === `${LOTES}/1/estado`);
      expect(peticion.request.body).toEqual({ estadoId: 3 });
      peticion.flush({ id: 1 });

      expect(avisos().some((t) => t.message === 'Estado del lote actualizado')).toBe(true);
    });

    it('si falla el cambio de estado avisa del error', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      componente.actualizarEstado(componente.lotes[0]);
      http.expectOne((r) => r.method === 'PATCH').flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some((t) => t.message === 'Error al actualizar estado del lote')).toBe(true);
    });

    it('un lote sin id no genera peticiones al cambiar estado ni visibilidad', () => {
      const { componente } = crear();

      componente.actualizarEstado({ codigo: 'X', areaM2: 1, estadoId: 1, activo: true });
      componente.toggleActivo({ codigo: 'X', areaM2: 1, estadoId: 1, activo: true });

      http.expectNone((r) => r.method === 'PATCH');
    });

    it('cambiar la visibilidad envía el valor y vuelve a aplicar los filtros', () => {
      const { componente } = crear();
      componente.filtroActivo = true;
      componente.aplicarFiltros();
      const lote = componente.lotes[0];
      lote.activo = false; // lo que hace el interruptor al hacer clic

      componente.toggleActivo(lote);
      const peticion = http.expectOne((r) => r.method === 'PATCH' && r.url === `${LOTES}/1/activo`);
      expect(peticion.request.body).toEqual({ activo: false });
      peticion.flush(null);

      expect(avisos().some((t) => t.message === 'Visibilidad del lote actualizada')).toBe(true);
      expect(componente.lotesFiltrados.some((l) => l.id === 1)).toBe(false);
    });

    it('si falla el cambio de visibilidad, el interruptor vuelve a su valor anterior', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const lote = componente.lotes[0];
      lote.activo = false;

      componente.toggleActivo(lote);
      http.expectOne((r) => r.method === 'PATCH').flush(null, { status: 500, statusText: 'Error' });

      expect(lote.activo).toBe(true);
      expect(avisos().some((t) => t.message === 'Error al cambiar visibilidad del lote')).toBe(true);
    });
  });

  describe('eliminar', () => {
    it('pide confirmación y, si se acepta, borra el lote y recarga', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarLote(componente.lotes[0]);
      expect(dialogo.config().title).toBe('Eliminar lote');
      expect(dialogo.config().message).toContain('LT-104');
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${LOTES}/1`).flush(null);
      await pendiente;
      http.expectOne(LOTES).flush([]);

      expect(avisos().some((t) => t.message === 'Lote eliminado correctamente')).toBe(true);
    });

    it('el botón Eliminar de la fila abre el diálogo', () => {
      const { componente, el } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      el.querySelector<HTMLButtonElement>('.btn-eliminar')!.click();

      expect(dialogo.isOpen()).toBe(true);
      expect(componente.lotes.length).toBe(7);
      dialogo.cancel();
    });

    it('si se cancela o el lote no tiene id no borra nada', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      await componente.eliminarLote({ codigo: 'X', areaM2: 1, estadoId: 1, activo: true });
      const pendiente = componente.eliminarLote(componente.lotes[0]);
      dialogo.cancel();
      await pendiente;

      http.expectNone((r) => r.method === 'DELETE');
    });

    it('si el servidor rechaza el borrado muestra su mensaje, o uno genérico', async () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const primero = componente.eliminarLote(componente.lotes[0]);
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE').flush({ mensaje: 'El lote tiene reservas' }, { status: 409, statusText: 'Conflict' });
      await primero;

      const segundo = componente.eliminarLote(componente.lotes[1]);
      dialogo.confirm();
      await esperar();
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await segundo;

      const mensajes = avisos().filter((t) => t.type === 'error').map((t) => t.message);
      expect(mensajes).toContain('El lote tiene reservas');
      expect(mensajes).toContain('Error al eliminar el lote');
    });
  });
});
