import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosComponent } from './usuarios.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

const USUARIOS = `${environment.apiUrl}/usuarios`;

const admins = [
  { id: 1, rolId: 1, nombreCompleto: 'Ana Gómez', correo: 'ana@arquinova.co', activo: true },
  { id: 2, rolId: 1, nombreCompleto: 'Luis Pérez', correo: 'luis@arquinova.co', activo: false },
];
const CLAVE_VALIDA = 'Segura#2026';

describe('UsuariosComponent', () => {
  let http: HttpTestingController;

  function crear(lista: unknown[] = admins) {
    TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(UsuariosComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(USUARIOS).flush(structuredClone(lista));
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('lista', () => {
    it('muestra una fila por administrador con su nombre, correo y estado', () => {
      const { el } = crear();

      const filas = el.querySelectorAll('tbody tr');
      expect(filas.length).toBe(2);
      expect(filas[0].textContent).toContain('Ana Gómez');
      expect(filas[0].textContent).toContain('ana@arquinova.co');
      expect(filas[0].querySelector('.badge')?.textContent?.trim()).toBe('Activo');
      expect(filas[0].querySelector('.badge')?.classList).toContain('activo');
      expect(filas[1].querySelector('.badge')?.textContent?.trim()).toBe('Inactivo');
      expect(filas[1].querySelector('.badge')?.classList).toContain('inactivo');
    });

    it('si falla la carga lo deja en la consola y la tabla queda vacía', () => {
      TestBed.configureTestingModule({ imports: [UsuariosComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(UsuariosComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();

      http.expectOne(USUARIOS).flush(null, { status: 500, statusText: 'Error' });

      expect(consola).toHaveBeenCalled();
      expect(fixture.componentInstance.listaAdmins).toEqual([]);
    });
  });

  describe('requisitos de contraseña', () => {
    it('evalúa cada requisito por separado', () => {
      const { componente } = crear();
      const probar = (clave: string) => {
        componente.usuarioActual.password = clave;
        return [
          componente.tieneLongitudMinima, componente.tieneMayuscula, componente.tieneMinuscula,
          componente.tieneNumero, componente.tieneEspecial, componente.esPasswordValida,
        ];
      };

      expect(probar('abc')).toEqual([false, false, true, false, false, false]);
      expect(probar('ABCDEFGH')).toEqual([true, true, false, false, false, false]);
      expect(probar('abcdefg1')).toEqual([true, false, true, true, false, false]);
      expect(probar('Abcdefg1')).toEqual([true, true, true, true, false, false]);
      expect(probar(CLAVE_VALIDA)).toEqual([true, true, true, true, true, true]);
    });

    it('la lista de requisitos aparece solo cuando se escribe algo y marca los cumplidos', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();
      expect(el.querySelector('.requisitos')).toBeNull();
      expect(componente.mostrarRequisitos).toBe(false);

      componente.usuarioActual.password = 'Abc';
      fixture.detectChanges();

      const items = el.querySelectorAll('.requisitos li');
      expect(items.length).toBe(5);
      expect(el.querySelectorAll('.requisitos li.ok').length).toBe(2); // mayúscula y minúscula
      expect(items[0].textContent).toContain('○');
      expect(items[1].textContent).toContain('✓');
    });

    it('una contraseña ausente cuenta como vacía', () => {
      const { componente } = crear();
      componente.usuarioActual.password = undefined;

      expect(componente.pass).toBe('');
      expect(componente.esPasswordValida).toBe(false);
    });
  });

  describe('modal', () => {
    it('"+ Nuevo Administrador" abre el formulario vacío y "Cancelar" lo cierra', () => {
      const { fixture, componente, el } = crear();

      el.querySelector<HTMLButtonElement>('.header-section .btn-primary')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h3')?.textContent).toContain('Crear Nuevo Administrador');
      expect(componente.usuarioActual).toEqual({ rolId: 1, nombreCompleto: '', correo: '', password: '', activo: true });
      expect(el.querySelector('.modal-footer .btn-primary')?.textContent).toContain('Guardar');

      el.querySelector<HTMLButtonElement>('.btn-secondary')!.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
    });

    it('la X cierra el formulario', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();

      el.querySelector<HTMLButtonElement>('.close-btn')!.click();

      expect(componente.modalAbierto).toBe(false);
    });

    it('editar carga los datos con la contraseña vacía y muestra la pista de que no cambia', () => {
      const { fixture, componente, el } = crear();

      el.querySelector<HTMLButtonElement>('.btn-action.edit')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-header h3')?.textContent).toContain('Editar Administrador');
      expect(componente.usuarioActual).toMatchObject({ id: 1, nombreCompleto: 'Ana Gómez', password: '' });
      expect(el.querySelector('.hint')?.textContent).toContain('la contraseña actual no cambia');
      expect(el.querySelector('.modal-footer .btn-primary')?.textContent).toContain('Actualizar');
    });

    it('el botón Ver/Ocultar alterna la visibilidad de la contraseña', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      fixture.detectChanges();
      const campo = el.querySelector<HTMLInputElement>('#usuarios-campo-3')!;
      expect(campo.type).toBe('password');

      el.querySelector<HTMLButtonElement>('.toggle-pass')!.click();
      fixture.detectChanges();

      expect(campo.type).toBe('text');
      expect(el.querySelector('.toggle-pass')?.textContent?.trim()).toBe('Ocultar');
    });

    it('abrir de nuevo el formulario limpia el error anterior', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.guardarUsuario();
      expect(componente.errorForm).not.toBe('');

      componente.abrirModalEditar(admins[0]);

      expect(componente.errorForm).toBe('');
    });
  });

  describe('validaciones al guardar', () => {
    it('exige nombre y correo', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = '   ';

      componente.guardarUsuario();
      fixture.detectChanges();

      expect(componente.errorForm).toBe('El nombre y el correo son obligatorios.');
      expect(el.querySelector('.error-form')?.textContent).toContain('obligatorios');
      http.expectNone(USUARIOS);
    });

    it('al crear exige contraseña', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = 'Nuevo';
      componente.usuarioActual.correo = 'nuevo@correo.com';

      componente.guardarUsuario();

      expect(componente.errorForm).toBe('La contraseña es obligatoria.');
      http.expectNone(USUARIOS);
    });

    it('rechaza una contraseña que no cumple los requisitos', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = 'Nuevo';
      componente.usuarioActual.correo = 'nuevo@correo.com';
      componente.usuarioActual.password = 'corta';

      componente.guardarUsuario();

      expect(componente.errorForm).toContain('mínimo 8 caracteres');
      http.expectNone(USUARIOS);
    });

    it('al editar, una contraseña nueva inválida también se rechaza', () => {
      const { componente } = crear();
      componente.abrirModalEditar(admins[0]);
      componente.usuarioActual.password = 'floja';

      componente.guardarUsuario();

      expect(componente.errorForm).toContain('mínimo 8 caracteres');
      http.expectNone(`${USUARIOS}/1`);
    });
  });

  describe('crear', () => {
    it('envía el administrador con la contraseña recortada, recarga y muestra el éxito 4 segundos', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = 'Nuevo Admin';
      componente.usuarioActual.correo = 'nuevo@correo.com';
      componente.usuarioActual.password = ` ${CLAVE_VALIDA} `;

      componente.guardarUsuario();
      const peticion = http.expectOne((r) => r.method === 'POST' && r.url === USUARIOS);
      expect(peticion.request.body).toEqual({ rolId: 1, nombreCompleto: 'Nuevo Admin', correo: 'nuevo@correo.com', activo: true, password: CLAVE_VALIDA });
      peticion.flush({ id: 3 });
      http.expectOne(USUARIOS).flush([]);
      fixture.detectChanges();

      expect(componente.modalAbierto).toBe(false);
      expect(el.querySelector('.alerta-exito')?.textContent).toContain('Administrador creado correctamente.');

      vi.advanceTimersByTime(4000);
      fixture.detectChanges();
      expect(el.querySelector('.alerta-exito')).toBeNull();
    });

    it('un segundo mensaje reinicia el temporizador del anterior', () => {
      const { componente } = crear();
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = 'Nuevo';
      componente.usuarioActual.correo = 'n@c.com';
      componente.usuarioActual.password = CLAVE_VALIDA;
      componente.guardarUsuario();
      http.expectOne((r) => r.method === 'POST').flush({ id: 3 });
      http.expectOne(USUARIOS).flush([]);
      vi.advanceTimersByTime(3000);

      componente.abrirModalEditar(admins[0]);
      componente.guardarUsuario();
      http.expectOne((r) => r.method === 'PUT').flush({ id: 1 });
      http.expectOne(USUARIOS).flush([]);
      vi.advanceTimersByTime(3000);

      expect(componente.mensajeExito).toBe('Administrador actualizado correctamente.');
      vi.advanceTimersByTime(1000);
      expect(componente.mensajeExito).toBe('');
    });

    it('muestra el detalle de validación que envía el servidor', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = 'Nuevo';
      componente.usuarioActual.correo = 'malo';
      componente.usuarioActual.password = CLAVE_VALIDA;

      componente.guardarUsuario();
      http.expectOne((r) => r.method === 'POST').flush(
        { detalles: { correo: 'Correo inválido.', nombre: 'Nombre muy corto.' } },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(componente.errorForm).toBe('Correo inválido. Nombre muy corto.');
      expect(componente.modalAbierto).toBe(true);
    });

    it('usa el mensaje del servidor, luego "message", y si no hay nada un texto genérico', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalCrear();
      componente.usuarioActual.nombreCompleto = 'Nuevo';
      componente.usuarioActual.correo = 'n@c.com';
      componente.usuarioActual.password = CLAVE_VALIDA;
      const intentar = (cuerpo: unknown, estado = 400) => {
        componente.guardarUsuario();
        http.expectOne((r) => r.method === 'POST').flush(cuerpo as object, { status: estado, statusText: 'Error' });
      };

      intentar({ mensaje: 'El correo ya existe' }, 409);
      expect(componente.errorForm).toBe('El correo ya existe');
      intentar({ message: 'Message en inglés' });
      expect(componente.errorForm).toBe('Message en inglés');
      intentar({ detalles: {} });
      expect(componente.errorForm).toBe('No se pudo guardar. Intenta de nuevo.');
      intentar(null, 500);
      expect(componente.errorForm).toBe('No se pudo guardar. Intenta de nuevo.');
    });
  });

  describe('editar', () => {
    it('sin contraseña nueva no la envía y avisa que se actualizó', () => {
      const { componente } = crear();
      componente.abrirModalEditar(admins[0]);
      componente.usuarioActual.nombreCompleto = 'Ana María Gómez';

      componente.guardarUsuario();
      const peticion = http.expectOne((r) => r.method === 'PUT' && r.url === `${USUARIOS}/1`);
      expect(peticion.request.body).toEqual({ id: 1, rolId: 1, nombreCompleto: 'Ana María Gómez', correo: 'ana@arquinova.co', activo: true });
      expect('password' in peticion.request.body).toBe(false);
      peticion.flush({ id: 1 });
      http.expectOne(USUARIOS).flush([]);

      expect(componente.mensajeExito).toBe('Administrador actualizado correctamente.');
      expect(componente.modalAbierto).toBe(false);
    });

    it('con contraseña nueva válida la envía y avisa que cambió', () => {
      const { componente } = crear();
      componente.abrirModalEditar(admins[0]);
      componente.usuarioActual.password = CLAVE_VALIDA;

      componente.guardarUsuario();
      const peticion = http.expectOne((r) => r.method === 'PUT');
      expect(peticion.request.body.password).toBe(CLAVE_VALIDA);
      peticion.flush({ id: 1 });
      http.expectOne(USUARIOS).flush([]);

      expect(componente.mensajeExito).toContain('contraseña cambiada');
    });

    it('si la edición no tiene id, no crea un administrador nuevo: avisa en el formulario', () => {
      const { componente } = crear();
      componente.abrirModalEditar({ rolId: 1, nombreCompleto: 'Sin id', correo: 's@c.com', activo: true });

      componente.guardarUsuario();

      http.expectNone((r) => r.method === 'POST');
      http.expectNone((r) => r.method === 'PUT');
      expect(componente.errorForm).toContain('No se pudo identificar al administrador');
      expect(componente.modalAbierto).toBe(true);
    });
  });

  describe('eliminar', () => {
    it('si el servidor no puede eliminar, la persona ve el aviso (con el motivo del servidor si lo da)', async () => {
      const { componente } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const sinMotivo = componente.eliminarAdmin(2);
      dialogo.confirm();
      await vi.advanceTimersByTimeAsync(0);
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await sinMotivo;
      expect(TestBed.inject(ToastService).toasts().some((a) => a.type === 'error' && a.message === 'No se pudo eliminar el administrador.')).toBe(true);

      const conMotivo = componente.eliminarAdmin(2);
      dialogo.confirm();
      await vi.advanceTimersByTimeAsync(0);
      http.expectOne((r) => r.method === 'DELETE').flush({ mensaje: 'No puedes eliminar tu propio usuario.' }, { status: 409, statusText: 'Conflict' });
      await conMotivo;
      expect(TestBed.inject(ToastService).toasts().some((a) => a.message === 'No puedes eliminar tu propio usuario.')).toBe(true);
      expect(consola).toHaveBeenCalled();
    });

    it('pide confirmación y, si se acepta, borra al administrador, recarga y avisa', async () => {
      const { fixture, componente, el } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      el.querySelector<HTMLButtonElement>('.btn-action.delete')!.click();
      expect(dialogo.config().title).toBe('Eliminar administrador');
      dialogo.confirm();
      await vi.advanceTimersByTimeAsync(0);
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${USUARIOS}/1`).flush(null);
      http.expectOne(USUARIOS).flush([admins[1]]);
      fixture.detectChanges();

      expect(componente.mensajeExito).toBe('Administrador eliminado correctamente.');
      expect(el.querySelectorAll('tbody tr').length).toBe(1);
    });

    it('si se cancela o no hay id no borra nada', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      await componente.eliminarAdmin(undefined);
      const pendiente = componente.eliminarAdmin(1);
      dialogo.cancel();
      await pendiente;

      http.expectNone((r) => r.method === 'DELETE');
    });

    it('si el borrado falla lo deja en la consola y no muestra éxito', async () => {
      const { componente } = crear();
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const dialogo = TestBed.inject(ConfirmDialogService);

      const pendiente = componente.eliminarAdmin(2);
      dialogo.confirm();
      await vi.advanceTimersByTimeAsync(0);
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 500, statusText: 'Error' });
      await pendiente;

      expect(consola).toHaveBeenCalled();
      expect(componente.mensajeExito).toBe('');
    });
  });
});
