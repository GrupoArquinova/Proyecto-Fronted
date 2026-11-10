import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProyectosComponent } from './proyectos';

const API = `${environment.apiUrl}/proyectos`;

const proyectos = [
  { id: 1, empresaId: 1, nombre: 'Los Andes', slug: 'los-andes', descripcion: 'Campestre', estadoProyecto: 'EN_CONSTRUCCION', tipoRegistro: 'OFERTA_COMERCIAL', destacado: true, publicado: true, activo: true, imagenUrl: 'https://img.test/a.jpg', fechaLanzamiento: '2026-10-31' },
  { id: 2, empresaId: 1, nombre: 'Portafolio Uno', slug: 'portafolio-uno', estadoProyecto: 'EN_DISENO', tipoRegistro: 'PORTAFOLIO', publicado: false, activo: true },
  { id: 3, empresaId: 1, nombre: 'Viejo', slug: 'viejo', estadoProyecto: 'FINALIZADO', tipoRegistro: 'OFERTA_COMERCIAL', publicado: false, activo: false },
];

describe('ProyectosComponent', () => {
  let component: ProyectosComponent;
  let fixture: ComponentFixture<ProyectosComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  /** Crea la pantalla y responde la lista inicial (con `null` queda cargando). */
  function crear(lista: unknown[] | null = proyectos) {
    TestBed.configureTestingModule({
      imports: [ProyectosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProyectosComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    if (lista) {
      http.expectOne(API).flush(structuredClone(lista)); // copia: el componente modifica su lista
      fixture.detectChanges();
    }
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  describe('lista', () => {
    it('muestra "Cargando" mientras llega la lista y luego las tarjetas de los proyectos activos', () => {
      crear(null);
      expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando');

      http.expectOne(API).flush(structuredClone(proyectos));
      fixture.detectChanges();

      expect(el.querySelector('.loading-state')).toBeNull();
      expect(el.querySelectorAll('.proyecto-card').length).toBe(2); // el inactivo queda fuera por defecto
      expect(el.textContent).toContain('Los Andes');
      expect(el.textContent).not.toContain('Viejo');
    });

    it('cada tarjeta trae su etapa y sus etiquetas (portafolio, destacado, sin imagen)', () => {
      crear();

      const tarjetas = el.querySelectorAll('.proyecto-card');
      expect(tarjetas[0].textContent).toContain('En construcción');
      expect(tarjetas[0].textContent).toContain('Destacado');
      expect(tarjetas[0].querySelector('img.proyecto-img')).not.toBeNull();
      expect(tarjetas[1].textContent).toContain('Portafolio');
      expect(tarjetas[1].textContent).toContain('Sin descripción');
      expect(tarjetas[1].querySelector('.sin-imagen')).not.toBeNull();
    });

    it('el filtro cambia entre activos, inactivos y todos, con sus contadores', () => {
      crear();
      expect(component.totalActivos).toBe(2);
      expect(component.totalInactivos).toBe(1);

      el.querySelectorAll<HTMLButtonElement>('.filtros button')[1].click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.proyecto-card').length).toBe(1);
      expect(el.querySelector('.proyecto-card')?.textContent).toContain('Inactivo');

      el.querySelectorAll<HTMLButtonElement>('.filtros button')[2].click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.proyecto-card').length).toBe(3);
    });

    it('avisa cuando no hay proyectos', () => {
      crear([]);
      expect(el.textContent).toContain('No hay proyectos registrados');
    });

    it('avisa cuando el filtro no encuentra ninguno', () => {
      crear([proyectos[0]]);
      el.querySelectorAll<HTMLButtonElement>('.filtros button')[1].click();
      fixture.detectChanges();
      expect(el.textContent).toContain('No hay proyectos inactivos');
    });

    it('si la lista falla muestra el error y avisa', () => {
      crear(null);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      http.expectOne(API).flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();

      expect(el.querySelector('.error-state')?.textContent).toContain('No se pudieron cargar los proyectos');
      expect(avisos().some(t => t.type === 'error')).toBe(true);
    });

    it('un proyecto sin el dato "activo" se considera activo', () => {
      crear();
      expect(component.esActivo({ nombre: 'x' } as never)).toBe(true);
      expect(component.esActivo({ nombre: 'x', activo: false } as never)).toBe(false);
      expect(component.etiquetaEstado('EN_TRAMITE')).toBe('En trámite');
    });
  });

  describe('crear y editar', () => {
    it('"+ Nuevo" abre el formulario vacío y "Cancelar" lo cierra', () => {
      crear();

      el.querySelector<HTMLButtonElement>('.btn-nuevo')?.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-content h2')?.textContent).toContain('Crear Nuevo Proyecto');
      expect(component.proyectoForm.value.estadoProyecto).toBe('EN_DISENO');
      expect(component.proyectoForm.value.publicado).toBe(false);

      el.querySelector<HTMLButtonElement>('.btn-cancel')?.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
    });

    it('el nombre es obligatorio: sin él no guarda y marca el formulario', () => {
      crear();
      component.abrirModalCrear();

      component.guardarProyecto();

      http.expectNone(API);
      expect(component.proyectoForm.get('nombre')?.touched).toBe(true);
    });

    it('guarda un proyecto nuevo: lo manda sin tipo vacío, lo pone primero en la lista y avisa', () => {
      crear();
      component.abrirModalCrear();
      component.proyectoForm.patchValue({ nombre: 'El Encanto', tipoProyecto: '' });

      component.guardarProyecto();

      const peticion = http.expectOne(r => r.method === 'POST' && r.url === API);
      expect(peticion.request.body.nombre).toBe('El Encanto');
      expect(peticion.request.body.tipoProyecto).toBeNull();
      peticion.flush({ id: 9, nombre: 'El Encanto', activo: true, estadoProyecto: 'EN_DISENO' });

      expect(component.proyectos[0].id).toBe(9);
      expect(component.mostrarModal).toBe(false);
      expect(avisos().some(t => t.message.includes('creado'))).toBe(true);
    });

    it('si crear falla avisa y deja el formulario abierto', () => {
      crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      component.abrirModalCrear();
      component.proyectoForm.patchValue({ nombre: 'El Encanto' });

      component.guardarProyecto();
      http.expectOne(r => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });

      expect(component.mostrarModal).toBe(true);
      expect(avisos().some(t => t.message.includes('Error al crear'))).toBe(true);
    });

    it('"Editar" carga los datos del proyecto y al guardar actualiza su tarjeta', () => {
      crear();

      el.querySelectorAll<HTMLButtonElement>('.btn-outline')[0].click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-content h2')?.textContent).toContain('Editar Proyecto');
      expect(component.proyectoForm.value.nombre).toBe('Los Andes');
      expect(component.proyectoForm.value.destacado).toBe(true);

      component.proyectoForm.patchValue({ nombre: 'Los Andes II' });
      component.guardarProyecto();

      const peticion = http.expectOne(r => r.method === 'PUT' && r.url === `${API}/1`);
      expect(peticion.request.body.nombre).toBe('Los Andes II');
      peticion.flush({ ...proyectos[0], nombre: 'Los Andes II' });
      fixture.detectChanges();

      expect(component.proyectos[0].nombre).toBe('Los Andes II');
      expect(component.mostrarModal).toBe(false);
      expect(el.textContent).toContain('Los Andes II');
    });

    it('si actualizar falla avisa', () => {
      crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      component.abrirModalEditar(proyectos[0] as never);

      component.guardarProyecto();
      http.expectOne(r => r.method === 'PUT').flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some(t => t.message.includes('Error al actualizar'))).toBe(true);
    });

    it('al editar un proyecto con pocos datos usa valores por defecto', () => {
      crear();

      component.abrirModalEditar({ nombre: 'Mínimo' } as never);

      expect(component.proyectoForm.value).toMatchObject({ estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', descripcion: '', publicado: false });
    });
  });

  describe('publicar y eliminar', () => {
    it('el botón Publicado/Borrador cambia la visibilidad del proyecto', () => {
      crear();

      el.querySelectorAll<HTMLButtonElement>('.btn-action')[0].click(); // Los Andes está publicado: pasa a borrador
      const peticion = http.expectOne(r => r.method === 'PUT' && r.url === `${API}/1`);
      expect(peticion.request.body).toMatchObject({ publicado: false, nombre: 'Los Andes' });
      peticion.flush({ ...proyectos[0], publicado: false });

      expect(component.proyectos[0].publicado).toBe(false);
      expect(avisos().some(t => t.message.includes('publicación'))).toBe(true);
    });

    it('si cambiar la visibilidad falla avisa', () => {
      crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      component.togglePublicado(component.proyectos[1]);
      http.expectOne(r => r.method === 'PUT').flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some(t => t.message.includes('visibilidad'))).toBe(true);
    });

    it('eliminar pide confirmación y, si se acepta, lo quita de la lista', async () => {
      crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = component.eliminarProyecto(1);
      expect(dialogo.config().message).toContain('Los Andes');
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(r => r.method === 'DELETE' && r.url === `${API}/1`).flush(null);
      await pendiente;

      expect(component.proyectos.some(p => p.id === 1)).toBe(false);
      expect(avisos().some(t => t.message.includes('eliminado'))).toBe(true);
    });

    it('si se cancela la confirmación no elimina nada', async () => {
      crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = component.eliminarProyecto(1);
      dialogo.cancel();
      await pendiente;

      http.expectNone(r => r.method === 'DELETE');
      expect(component.proyectos.length).toBe(3);
    });

    it('si eliminar falla avisa y deja el proyecto', async () => {
      crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = component.eliminarProyecto(2);
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(r => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await pendiente;

      expect(component.proyectos.some(p => p.id === 2)).toBe(true);
      expect(avisos().some(t => t.message.includes('Error al eliminar'))).toBe(true);
    });
  });

  describe('imagen del proyecto', () => {
    const archivoEvento = (archivo?: File) => ({ target: { files: archivo ? [archivo] : [], value: 'x' } }) as unknown as Event;

    it('sube la imagen a Cloudinary y deja su URL en el formulario', () => {
      crear();
      const pendiente = new Subject<{ url: string; resourceType: string }>();
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(pendiente as never);

      component.onImagenSeleccionada(archivoEvento(new File(['x'], 'foto.png')));
      expect(component.subiendoImagen).toBe(true);
      expect(component.nombreArchivoSeleccionado).toBe('foto.png');

      pendiente.next({ url: 'https://res.cloudinary.com/n/foto.png', resourceType: 'image' });
      expect(component.proyectoForm.value.imagenUrl).toBe('https://res.cloudinary.com/n/foto.png');
      expect(component.subiendoImagen).toBe(false);
    });

    it('si la subida falla avisa y limpia el nombre', () => {
      crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(throwError(() => new Error('sin red')));

      component.onImagenSeleccionada(archivoEvento(new File(['x'], 'foto.png')));

      expect(component.errorImagen).toContain('No se pudo subir');
      expect(component.nombreArchivoSeleccionado).toBe('');
      expect(component.subiendoImagen).toBe(false);
    });

    it('sin archivo elegido no hace nada y "Quitar imagen" borra la URL', () => {
      crear();
      const subir = vi.spyOn(TestBed.inject(CloudinaryService), 'subirArchivo').mockReturnValue(of({ url: 'x', resourceType: 'image' }));

      component.onImagenSeleccionada(archivoEvento());
      expect(subir).not.toHaveBeenCalled();

      component.proyectoForm.patchValue({ imagenUrl: 'https://img.test/a.jpg' });
      component.nombreArchivoSeleccionado = 'a.jpg';
      component.quitarImagen();
      expect(component.proyectoForm.value.imagenUrl).toBe('');
      expect(component.nombreArchivoSeleccionado).toBe('');
    });

    it('la imagen de una tarjeta se amplía como foto normal, sin visor ni texto de 360°', () => {
      crear();
      component.abrirModalCrear();
      fixture.detectChanges();
      expect(el.textContent).toContain('Imagen del proyecto');
      expect(el.textContent).not.toContain('360');

      component.ampliarImagen('https://res.cloudinary.com/demo/foto.jpg');
      fixture.detectChanges();
      expect(el.querySelector('img.imagen-ampliada')).not.toBeNull();
      expect(el.querySelector('#panorama-viewer')).toBeNull();

      component.cerrarImagen();
      fixture.detectChanges();
      expect(el.querySelector('img.imagen-ampliada')).toBeNull();
    });

    it('ampliar sin URL no abre nada', () => {
      crear();
      component.ampliarImagen(undefined);
      expect(component.imagenExpandidaUrl).toBeNull();
    });
  });
});
