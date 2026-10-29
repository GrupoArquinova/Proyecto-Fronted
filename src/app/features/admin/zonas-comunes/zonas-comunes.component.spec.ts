import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZonasComunesComponent } from './zonas-comunes.component';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;
const ZONAS = `${API}/zonas-comunes`;
const IMAGENES = `${API}/zonas-comunes-imagenes`;

const proyectos = [{ id: 1, nombre: 'El Encanto' }, { id: 2, nombre: 'Solara' }];
const zonasP1 = [
  { id: 10, proyectoId: 1, nombre: 'Piscina', descripcion: 'Con deck', publicado: true, activo: true },
  { id: 11, proyectoId: 1, nombre: 'Cancha', publicado: false, activo: true },
];
const zonasP2 = [{ id: 12, proyectoId: 2, nombre: 'Parque', publicado: true, activo: true }];

describe('ZonasComunesComponent (amenidades)', () => {
  let http: HttpTestingController;

  function crear(p1: unknown[] = zonasP1, p2: unknown[] = zonasP2) {
    TestBed.configureTestingModule({
      imports: [ZonasComunesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ZonasComunesComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${API}/proyectos`).flush(structuredClone(proyectos));
    http.expectOne(`${ZONAS}/proyecto/1`).flush(structuredClone(p1));
    http.expectOne(`${ZONAS}/proyecto/2`).flush(structuredClone(p2));
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  /** Atiende la recarga de todos los proyectos que hace la pantalla tras guardar o eliminar. */
  function recargarTodo(p1: unknown[] = zonasP1, p2: unknown[] = zonasP2) {
    http.expectOne(`${ZONAS}/proyecto/1`).flush(structuredClone(p1));
    http.expectOne(`${ZONAS}/proyecto/2`).flush(structuredClone(p2));
  }

  const esperar = () => new Promise((r) => setTimeout(r, 0));

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('lista', () => {
    it('reúne las amenidades de todos los proyectos con su nombre de proyecto y estado', () => {
      const { c, el } = crear();
      expect(c.listaZonas.length).toBe(3);
      const tarjetas = el.querySelectorAll('.item-card');
      expect(tarjetas.length).toBe(3);
      expect(tarjetas[0].textContent).toContain('El Encanto');
      expect(tarjetas[0].textContent).toContain('Piscina');
      expect(tarjetas[0].textContent).toContain('Publicado');
      expect(tarjetas[1].textContent).toContain('Oculto');
      expect(tarjetas[1].textContent).toContain('Sin descripción registrada.');
      expect(tarjetas[2].textContent).toContain('Solara');
      expect(el.querySelector('.loading-overlay')).toBeNull();
    });

    it('sin amenidades muestra el estado vacío con el texto de amenidades', () => {
      const { el } = crear([], []);
      expect(el.querySelector('.empty-state')?.textContent).toContain('No hay amenidades registradas.');
    });

    it('si fallan los proyectos lo deja en la consola y la lista queda vacía', () => {
      TestBed.configureTestingModule({ imports: [ZonasComunesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(ZonasComunesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(`${API}/proyectos`).flush(null, { status: 500, statusText: 'E' });
      expect(consola).toHaveBeenCalled();
      expect(fixture.componentInstance.listaZonas).toEqual([]);
    });

    it('sin proyectos no pide amenidades y deja la lista vacía', () => {
      TestBed.configureTestingModule({ imports: [ZonasComunesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const fixture = TestBed.createComponent(ZonasComunesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(`${API}/proyectos`).flush([]);
      expect(fixture.componentInstance.listaZonas).toEqual([]);
      expect(fixture.componentInstance.cargando).toBe(false);
    });

    it('si falla un proyecto al cargar "todos" muestra las amenidades de los demás', () => {
      TestBed.configureTestingModule({ imports: [ZonasComunesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const fixture = TestBed.createComponent(ZonasComunesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(`${API}/proyectos`).flush(structuredClone(proyectos));
      http.expectOne(`${ZONAS}/proyecto/1`).flush(null, { status: 500, statusText: 'E' });
      http.expectOne(`${ZONAS}/proyecto/2`).flush(structuredClone(zonasP2));
      expect(fixture.componentInstance.listaZonas.map((z) => z.nombre)).toEqual(['Parque']);
      expect(fixture.componentInstance.cargando).toBe(false);
    });

    it('si falla el último proyecto el resultado igual se completa', () => {
      TestBed.configureTestingModule({ imports: [ZonasComunesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const fixture = TestBed.createComponent(ZonasComunesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne(`${API}/proyectos`).flush(structuredClone(proyectos));
      http.expectOne(`${ZONAS}/proyecto/1`).flush(structuredClone(zonasP1));
      http.expectOne(`${ZONAS}/proyecto/2`).flush(null, { status: 500, statusText: 'E' });
      expect(fixture.componentInstance.listaZonas.length).toBe(2);
      expect(fixture.componentInstance.cargando).toBe(false);
    });
  });

  describe('filtro por proyecto', () => {
    it('al elegir un proyecto pide solo sus amenidades', () => {
      const { fixture, c, el } = crear();
      const select = el.querySelector('.select-proyecto') as HTMLSelectElement;
      expect(select.querySelectorAll('option').length).toBe(3);
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      http.expectOne(`${ZONAS}/proyecto/2`).flush(structuredClone(zonasP2));
      http.expectOne(`${API}/multimedia/proyecto/2`).flush([]);
      fixture.detectChanges();

      expect(c.listaZonas.map((z) => z.nombre)).toEqual(['Parque']);
      expect(c.listaZonas[0].proyectoNombre).toBe('Solara');
    });

    it('un proyecto desconocido usa un nombre genérico', () => {
      const { c } = crear();
      c.proyectoIdSeleccionado = 99;
      c.cargarZonas();
      http.expectOne(`${ZONAS}/proyecto/99`).flush([{ id: 1, nombre: 'X' }]);
      expect(c.listaZonas[0].proyectoNombre).toBe('Proyecto 99');
    });

    it('si falla la carga de un proyecto avisa con el mensaje de amenidades', () => {
      vi.useFakeTimers();
      const { fixture, c, el } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.proyectoIdSeleccionado = 1;
      c.cargarZonas();
      http.expectOne(`${ZONAS}/proyecto/1`).flush(null, { status: 500, statusText: 'E' });
      fixture.detectChanges();
      expect(c.cargando).toBe(false);
      expect(el.querySelector('.alerta-flotante')?.textContent).toContain('Error al obtener las amenidades.');
      vi.advanceTimersByTime(4000);
      fixture.detectChanges();
      expect(el.querySelector('.alerta-flotante')).toBeNull();
    });
  });

  describe('imagen de fondo de Amenidades', () => {
    const MULTI = `${API}/multimedia`;
    const fondo = (id: number, extra: object = {}) => ({ id, proyectoId: 2, tipo: 'FONDO_AMENIDADES', url: `https://c/f${id}.jpg`, activo: true, ...extra });

    function elegirProyecto2(lista: unknown[]) {
      const r = crear();
      const select = r.el.querySelector('.select-proyecto') as HTMLSelectElement;
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      http.expectOne(`${ZONAS}/proyecto/2`).flush(structuredClone(zonasP2));
      http.expectOne(`${MULTI}/proyecto/2`).flush(structuredClone(lista));
      r.fixture.detectChanges();
      return r;
    }

    it('con "todos" no hay sección', () => {
      const { c, el } = crear();
      expect(el.querySelector('.fondo-amenidades')).toBeNull();
      expect(c.fondoAmenidades).toBeNull();
    });

    it('con un proyecto muestra la más reciente activa', () => {
      const r = elegirProyecto2([fondo(1), fondo(3), fondo(4, { activo: false }), { id: 5, tipo: 'IMAGEN', url: 'x' }]);
      expect(r.c.fondoAmenidades?.id).toBe(3);
      expect(r.el.querySelector('.fondo-amenidades-img')?.getAttribute('src')).toBe('https://c/f3.jpg');
      expect(r.el.querySelector('.fondo-amenidades label')?.textContent).toContain('Cambiar imagen');
    });

    it('sin imagen ofrece subirla', () => {
      const { el } = elegirProyecto2([]);
      expect(el.querySelector('.fondo-amenidades-img')).toBeNull();
      expect(el.querySelector('.fondo-amenidades label')?.textContent).toContain('+ Subir imagen de fondo');
      expect(el.querySelector('.btn-quitar-fondo')).toBeNull();
    });

    it('subir guarda FONDO_AMENIDADES del proyecto y elimina la anterior', () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { c } = elegirProyecto2([fondo(1)]);
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirImagen').mockReturnValue(of('https://c/nueva.jpg'));
      c.subirFondo({ target: { files: [new File(['a'], 'nueva.jpg')], value: 'x' } } as unknown as Event);

      const crearReq = http.expectOne(MULTI);
      expect(crearReq.request.method).toBe('POST');
      expect(crearReq.request.body).toMatchObject({ proyectoId: 2, tipo: 'FONDO_AMENIDADES', url: 'https://c/nueva.jpg', publicado: true, activo: true });
      crearReq.flush(fondo(7, { url: 'https://c/nueva.jpg' }));
      const borrado = http.expectOne(`${MULTI}/1`);
      expect(borrado.request.method).toBe('DELETE');
      borrado.flush(null);

      expect(c.fondoAmenidades?.id).toBe(7);
      expect(c.subiendoFondo).toBe(false);
      expect(c.mensajeAlerta).toBe('Imagen de fondo de Amenidades guardada.');
    });

    it('si la subida falla avisa del error y conserva la imagen actual', () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { c } = elegirProyecto2([fondo(1)]);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirImagen').mockReturnValue(throwError(() => new Error('x')));
      c.subirFondo({ target: { files: [new File(['a'], 'n.jpg')], value: '' } } as unknown as Event);

      expect(c.tipoAlerta).toBe('error');
      expect(c.subiendoFondo).toBe(false);
      expect(c.fondoAmenidades?.id).toBe(1);
    });

    it('sin archivo o con "todos" no sube nada', () => {
      const { c } = crear();
      const subir = vi.spyOn(TestBed.inject(CloudinaryService), 'subirImagen');
      c.subirFondo({ target: { files: [new File(['a'], 'n.jpg')], value: '' } } as unknown as Event);
      c.subirFondo({ target: { files: [], value: '' } } as unknown as Event);
      expect(subir).not.toHaveBeenCalled();
    });

    it('quitar pide confirmación y, al confirmar, la elimina', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { c } = elegirProyecto2([fondo(1)]);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const cancelado = c.quitarFondo();
      dialogo.cancel();
      await cancelado;
      http.expectNone(`${MULTI}/1`);
      expect(c.fondoAmenidades).not.toBeNull();

      const p = c.quitarFondo();
      dialogo.confirm();
      await p;
      http.expectOne(`${MULTI}/1`).flush(null);
      expect(c.fondoAmenidades).toBeNull();
      expect(c.mensajeAlerta).toBe('Imagen de fondo quitada.');
    });
  });

  describe('crear y editar', () => {
    it('"Nueva amenidad" abre el formulario con el primer proyecto y "Cancelar" lo cierra', () => {
      const { fixture, c, el } = crear();
      (el.querySelector('.header-actions .btn-primary') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-header h3')?.textContent).toBe('Nueva amenidad');
      expect(c.zonaActual.proyectoId).toBe(1);

      (el.querySelector('.modal-footer .btn-secondary') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-content')).toBeNull();
    });

    it('el proyecto por defecto es el filtrado; sin proyectos cae a 1', () => {
      const { c } = crear();
      c.proyectoIdSeleccionado = 2;
      c.abrirModalCrear();
      expect(c.zonaActual.proyectoId).toBe(2);
      c.proyectoIdSeleccionado = 'todos';
      c.listaProyectos = [];
      c.abrirModalCrear();
      expect(c.zonaActual.proyectoId).toBe(1);
    });

    it('exige nombre y proyecto antes de guardar', () => {
      vi.useFakeTimers();
      const { c } = crear();
      c.abrirModalCrear();
      c.zonaActual.nombre = '   ';
      c.guardarZona();
      expect(c.mensajeAlerta).toBe('El nombre de la amenidad es obligatorio.');

      c.zonaActual.nombre = 'Gimnasio';
      c.zonaActual.proyectoId = 0;
      c.guardarZona();
      expect(c.mensajeAlerta).toBe('Debe asociar la amenidad a un proyecto.');
      http.expectNone(ZONAS);
    });

    it('crea la amenidad con POST, avisa, cierra y recarga', () => {
      vi.useFakeTimers();
      const { c } = crear();
      c.abrirModalCrear();
      c.zonaActual.nombre = 'Gimnasio';
      c.guardarZona();
      expect(c.cargando).toBe(true);
      const req = http.expectOne(ZONAS);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.nombre).toBe('Gimnasio');
      req.flush({});
      expect(c.mensajeAlerta).toBe('Amenidad creada con éxito.');
      expect(c.mostrarModal).toBe(false);
      recargarTodo();
    });

    it('si falla la creación avisa y mantiene el formulario abierto', () => {
      vi.useFakeTimers();
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.abrirModalCrear();
      c.zonaActual.nombre = 'Gimnasio';
      c.guardarZona();
      http.expectOne(ZONAS).flush(null, { status: 500, statusText: 'E' });
      expect(c.mensajeAlerta).toBe('Error al crear la amenidad.');
      expect(c.mostrarModal).toBe(true);
      expect(c.cargando).toBe(false);
    });

    it('editar carga una copia de la amenidad y guarda con PUT', () => {
      vi.useFakeTimers();
      const { fixture, c, el } = crear();
      (el.querySelectorAll('.btn-icon.edit')[0] as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-header h3')?.textContent).toBe('Editar amenidad');
      expect(c.zonaActual.nombre).toBe('Piscina');
      expect(c.zonaActual).not.toBe(c.listaZonas[0]);

      c.zonaActual.nombre = 'Piscina climatizada';
      c.guardarZona();
      const req = http.expectOne(`${ZONAS}/10`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.nombre).toBe('Piscina climatizada');
      req.flush({});
      expect(c.mensajeAlerta).toBe('Amenidad actualizada con éxito.');
      recargarTodo();
    });

    it('si falla la edición avisa', () => {
      vi.useFakeTimers();
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.abrirModalEditar(c.listaZonas[0]);
      c.guardarZona();
      http.expectOne(`${ZONAS}/10`).flush(null, { status: 500, statusText: 'E' });
      expect(c.mensajeAlerta).toBe('Error al actualizar la amenidad.');
      expect(c.cargando).toBe(false);
    });
  });

  describe('eliminar amenidad', () => {
    it('al confirmar elimina, avisa y recarga', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { c } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.prepararEliminacion(10);
      expect(dialogo.config().title).toBe('Eliminar amenidad');
      dialogo.confirm();
      await p;
      const req = http.expectOne(`${ZONAS}/10`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(c.mensajeAlerta).toBe('Amenidad eliminada correctamente.');
      recargarTodo();
    });

    it('si se cancela o no hay id no pide nada', async () => {
      const { c } = crear();
      await c.prepararEliminacion(undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.prepararEliminacion(10);
      dialogo.cancel();
      await p;
      await esperar();
      http.expectNone(`${ZONAS}/10`);
    });

    it('si el servidor falla avisa que no se pudo eliminar', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { c } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);
      const p = c.prepararEliminacion(10);
      dialogo.confirm();
      await p;
      http.expectOne(`${ZONAS}/10`).flush(null, { status: 409, statusText: 'C' });
      expect(c.mensajeAlerta).toBe('No se pudo eliminar el registro.');
      expect(c.cargando).toBe(false);
    });
  });

  describe('avisos', () => {
    it('un error se muestra en rojo con ✕ y un éxito en verde con ✓', () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { fixture, c, el } = crear();

      c.guardarZona();
      fixture.detectChanges();
      const error = el.querySelector('.alerta-flotante') as HTMLElement;
      expect(error.classList.contains('alerta-error')).toBe(true);
      expect(error.textContent).toContain('✕');
      expect(error.textContent).not.toContain('✓');
      expect(error.getAttribute('role')).toBe('alert');

      (c as unknown as { mostrarAlerta: (m: string) => void }).mostrarAlerta('Listo.');
      fixture.detectChanges();
      const exito = el.querySelector('.alerta-flotante') as HTMLElement;
      expect(exito.classList.contains('alerta-error')).toBe(false);
      expect(exito.textContent).toContain('✓');
      expect(exito.getAttribute('role')).toBe('status');
    });

    it('si fallan los proyectos avisa con un error visible', () => {
      TestBed.configureTestingModule({ imports: [ZonasComunesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(ZonasComunesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();

      http.expectOne(`${API}/proyectos`).flush(null, { status: 500, statusText: 'Error' });

      expect(fixture.componentInstance.mensajeAlerta).toBe('No se pudieron cargar los proyectos.');
      expect(fixture.componentInstance.tipoAlerta).toBe('error');
    });
  });

  describe('galería de imágenes', () => {
    const imgs = [
      { id: 1, zonaComunId: 10, imagenUrl: 'https://x/1.jpg', titulo: 'Vista', esPrincipal: true },
      { id: 2, zonaComunId: 10, imagenUrl: 'https://x/2.jpg', titulo: '', esPrincipal: false },
    ];

    function abrirGaleria(lista: unknown[] = imgs) {
      const base = crear();
      (base.el.querySelectorAll('.btn-icon.gallery')[0] as HTMLElement).click();
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush(structuredClone(lista));
      base.fixture.detectChanges();
      return base;
    }

    it('abre la galería de la amenidad y lista sus imágenes', () => {
      const { el } = abrirGaleria();
      expect(el.querySelector('.modal-galeria h3')?.textContent).toContain('Galería: Piscina');
      expect(el.querySelectorAll('.img-card').length).toBe(2);
      expect(el.querySelector('h4')?.textContent).toContain('(2)');
      expect(el.querySelectorAll('.img-title')[1].textContent).toContain('Sin título');
    });

    it('sin imágenes muestra el aviso de amenidad sin imágenes', () => {
      const { el } = abrirGaleria([]);
      expect(el.querySelector('.sin-imagenes-txt')?.textContent).toContain('No hay imágenes registradas para esta amenidad.');
    });

    it('si falla la carga de imágenes lo deja en la consola', () => {
      const { fixture, c, el } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.abrirGaleriaImagenes(c.listaZonas[0]);
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush(null, { status: 500, statusText: 'E' });
      fixture.detectChanges();
      expect(consola).toHaveBeenCalled();
      expect(el.querySelector('.sin-imagenes-txt')).not.toBeNull();
    });

    it('la imagen principal lleva su etiqueta y solo las demás ofrecen "marcar como principal"', () => {
      const { el } = abrirGaleria();
      const tarjetas = el.querySelectorAll('.img-card');

      expect(tarjetas[0].querySelector('.badge-principal')?.textContent).toContain('Principal');
      expect(tarjetas[0].querySelector('.btn-icon-mini.principal')).toBeNull();
      expect(tarjetas[1].querySelector('.badge-principal')).toBeNull();
      expect(tarjetas[1].querySelector('.btn-icon-mini.principal')).not.toBeNull();
    });

    it('marcar una imagen como principal llama al servidor, recarga la galería y avisa con éxito', () => {
      const { fixture, c, el } = abrirGaleria();

      (el.querySelectorAll('.img-card')[1].querySelector('.btn-icon-mini.principal') as HTMLButtonElement).click();
      const peticion = http.expectOne(`${IMAGENES}/2/principal`);
      expect(peticion.request.method).toBe('PATCH');
      peticion.flush({ id: 2, esPrincipal: true });
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush([
        { id: 1, zonaComunId: 10, imagenUrl: 'https://x/1.jpg', titulo: 'Vista', esPrincipal: false },
        { id: 2, zonaComunId: 10, imagenUrl: 'https://x/2.jpg', titulo: '', esPrincipal: true },
      ]);
      fixture.detectChanges();

      expect(c.tipoAlerta).toBe('exito');
      expect(el.querySelector('.alerta-flotante')?.textContent).toContain('Imagen principal actualizada.');
      expect(el.querySelectorAll('.img-card')[1].querySelector('.badge-principal')).not.toBeNull();
    });

    it('si no se puede marcar como principal avisa con un error; una imagen ya principal o sin id no llama a nada', () => {
      const { fixture, c, el } = abrirGaleria();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      c.marcarImagenPrincipal(c.listaImagenesZona[0]); // ya es la principal
      c.marcarImagenPrincipal({ zonaComunId: 10, imagenUrl: 'x', esPrincipal: false } as never); // sin id
      http.expectNone((r) => r.url.endsWith('/principal'));

      c.marcarImagenPrincipal(c.listaImagenesZona[1]);
      http.expectOne(`${IMAGENES}/2/principal`).flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();

      expect(c.tipoAlerta).toBe('error');
      expect(el.querySelector('.alerta-flotante.alerta-error')?.textContent).toContain('No se pudo marcar la imagen como principal.');
    });

    it('si falla eliminar una imagen o cargar las imágenes, la persona ve un aviso de error', async () => {
      const { fixture, c, el } = abrirGaleria();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = c.eliminarImagenZona(2);
      dialogo.confirm();
      await pendiente;
      http.expectOne(`${IMAGENES}/2`).flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(el.querySelector('.alerta-flotante.alerta-error')?.textContent).toContain('No se pudo eliminar la imagen.');

      c.cargarImagenesDeZona(10);
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush(null, { status: 500, statusText: 'Error' });
      expect(c.mensajeAlerta).toBe('No se pudieron cargar las imágenes de la amenidad.');
      expect(c.tipoAlerta).toBe('error');
    });

    it('una imagen que no carga se reemplaza por un marcador', () => {
      const { fixture, c, el } = abrirGaleria();
      el.querySelector('.img-card img')?.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(c.imagenesConError.has(1)).toBe(true);
      expect(el.querySelectorAll('.img-error-placeholder').length).toBe(1);
      c.marcarImagenConError(undefined);
      expect(c.imagenesConError.size).toBe(1);
    });

    it('exige una URL para agregar la imagen', () => {
      vi.useFakeTimers();
      const { c } = abrirGaleria();
      c.nuevaImagen.imagenUrl = '  ';
      c.agregarImagenAZona();
      expect(c.mensajeAlerta).toBe('Debe ingresar una URL o seleccionar un archivo de imagen.');
      http.expectNone(IMAGENES);
    });

    it('agrega una imagen con POST ligada a la amenidad y recarga la galería', () => {
      vi.useFakeTimers();
      const { c } = abrirGaleria();
      c.nuevaImagen.imagenUrl = 'https://x/3.jpg';
      c.nuevaImagen.titulo = 'Nueva';
      c.agregarImagenAZona();
      const req = http.expectOne(IMAGENES);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.zonaComunId).toBe(10);
      req.flush({});
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush([]);
      expect(c.mensajeAlerta).toBe('Imagen agregada a la galería correctamente.');
      expect(c.nuevaImagen.imagenUrl).toBe('');
    });

    it('si falla al agregar o al actualizar avisa', () => {
      vi.useFakeTimers();
      const { c } = abrirGaleria();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.nuevaImagen.imagenUrl = 'https://x/3.jpg';
      c.agregarImagenAZona();
      http.expectOne(IMAGENES).flush(null, { status: 500, statusText: 'E' });
      expect(c.mensajeAlerta).toBe('Error al guardar la imagen.');

      c.editarImagenZona(c.listaImagenesZona[0]);
      c.agregarImagenAZona();
      http.expectOne(`${IMAGENES}/1`).flush(null, { status: 500, statusText: 'E' });
      expect(c.mensajeAlerta).toBe('Error al actualizar la imagen.');
    });

    it('editar una imagen pasa el formulario a modo edición y guarda con PUT', () => {
      vi.useFakeTimers();
      const { fixture, c, el } = abrirGaleria();
      (el.querySelectorAll('.btn-icon-mini:not(.delete)')[0] as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.sub-form-titulo')?.textContent).toContain('Editando imagen');
      expect(el.querySelector('.btn-agregar-img')?.textContent).toContain('Guardar Cambios');
      expect(el.querySelector('.img-card.editando')).not.toBeNull();

      c.nuevaImagen.titulo = 'Cambiada';
      c.agregarImagenAZona();
      const req = http.expectOne(`${IMAGENES}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.titulo).toBe('Cambiada');
      req.flush({});
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush([]);
      expect(c.imagenEditandoId).toBeNull();
      expect(c.mensajeAlerta).toBe('Imagen actualizada correctamente.');
    });

    it('"Cancelar edición" vuelve al formulario de agregar', () => {
      const { fixture, c, el } = abrirGaleria();
      c.editarImagenZona(c.listaImagenesZona[0]);
      fixture.detectChanges();
      (el.querySelector('.btn-cancelar-edicion') as HTMLElement).click();
      fixture.detectChanges();
      expect(c.imagenEditandoId).toBeNull();
      expect(c.nuevaImagen.imagenUrl).toBe('');
      expect(el.querySelector('.sub-form-titulo')).toBeNull();
    });

    it('eliminar una imagen confirmada la borra, sale de la edición y recarga', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const { c } = abrirGaleria();
      const dialogo = TestBed.inject(ConfirmDialogService);
      c.editarImagenZona(c.listaImagenesZona[0]);
      const p = c.eliminarImagenZona(1);
      expect(dialogo.config().title).toBe('Eliminar imagen');
      dialogo.confirm();
      await p;
      const req = http.expectOne(`${IMAGENES}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      http.expectOne(`${IMAGENES}/zona-comun/10`).flush([]);
      expect(c.imagenEditandoId).toBeNull();
      expect(c.mensajeAlerta).toBe('Imagen eliminada.');
    });

    it('eliminar cancelado, sin id o con error del servidor no cambia la galería', async () => {
      const { c } = abrirGaleria();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);
      await c.eliminarImagenZona(undefined);

      const p1 = c.eliminarImagenZona(2);
      dialogo.cancel();
      await p1;
      await esperar();
      http.expectNone(`${IMAGENES}/2`);

      const p2 = c.eliminarImagenZona(2);
      dialogo.confirm();
      await p2;
      http.expectOne(`${IMAGENES}/2`).flush(null, { status: 500, statusText: 'E' });
      expect(consola).toHaveBeenCalled();
      expect(c.listaImagenesZona.length).toBe(2);
    });

    it('subir un archivo guarda la URL de Cloudinary en el formulario', () => {
      const { c } = abrirGaleria();
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirImagen').mockReturnValue(of('https://c/z.jpg'));
      const archivo = new File(['a'], 'z.jpg');
      c.onArchivoSeleccionado({ target: { files: [archivo] } } as unknown as Event);
      expect(c.nuevaImagen.imagenUrl).toBe('https://c/z.jpg');
      expect(c.subiendoImagen).toBe(false);
      expect(c.archivoSeleccionado).toBe(archivo);
    });

    it('sin archivo no sube; si la subida falla muestra el error en la galería', () => {
      const { fixture, c, el } = abrirGaleria();
      const subir = vi.spyOn(TestBed.inject(CloudinaryService), 'subirImagen').mockReturnValue(throwError(() => new Error('x')));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      c.onArchivoSeleccionado({ target: { files: [] } } as unknown as Event);
      expect(subir).not.toHaveBeenCalled();

      c.onArchivoSeleccionado({ target: { files: [new File(['a'], 'z.jpg')] } } as unknown as Event);
      fixture.detectChanges();
      expect(c.errorImagen).toContain('No se pudo subir la imagen');
      expect(c.archivoSeleccionado).toBeNull();
      expect(el.querySelector('.error-texto')?.textContent).toContain('No se pudo subir la imagen');
    });

    it('mientras sube muestra el texto de progreso y bloquea el botón', () => {
      const { fixture, c, el } = abrirGaleria();
      c.subiendoImagen = true;
      fixture.detectChanges();
      expect(el.querySelector('.subiendo-texto')?.textContent).toContain('Subiendo imagen');
      const boton = el.querySelector('.btn-agregar-img') as HTMLButtonElement;
      expect(boton.disabled).toBe(true);
      expect(boton.textContent).toContain('Subiendo...');
    });

    it('cerrar la galería limpia el estado', () => {
      const { fixture, c, el } = abrirGaleria();
      (el.querySelector('.modal-galeria .modal-footer .btn-secondary') as HTMLElement).click();
      fixture.detectChanges();
      expect(c.mostrarModalImagenes).toBe(false);
      expect(c.zonaSeleccionadaParaGaleria).toBeNull();
      expect(c.listaImagenesZona).toEqual([]);
      expect(el.querySelector('.modal-galeria')).toBeNull();
    });
  });
});
