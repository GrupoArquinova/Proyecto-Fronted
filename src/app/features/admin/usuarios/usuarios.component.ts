import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { infoDeRol, esRol } from '../../../core/models/roles';
import { RolApi, RolService } from '../../../core/services/rol.service';
import { Usuario } from '../../../core/models/usuario.models';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/errores';

// Sin OnPush a propósito: esta pantalla guarda sus datos en variables normales (sin signals) que cambia al llegar la respuesta
// del servidor; con OnPush se quedaría en "Cargando...". Migrarla exige pasar esos datos a signals y probarla de punta a punta.
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})
export class UsuariosComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);
  listaAdmins: Usuario[] = [];
  /** Roles que entrega el backend (GET /api/roles); sus ids no se suponen. */
  roles: RolApi[] = [];
  errorRoles = false;
  private rolService = inject(RolService);
  modalAbierto = false;
  esEdicion = false;
  verPassword = false;
  errorForm = '';
  mensajeExito = '';
  private timerMensaje?: ReturnType<typeof setTimeout>;

  usuarioActual: Usuario = this.usuarioVacio();

  private usuarioService = inject(UsuarioService);
  private confirmDialog = inject(ConfirmDialogService);

  ngOnInit(): void {
    this.cargarAdmins();
    this.rolService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (roles) => (this.roles = roles.filter((r) => r.activo !== false)),
      error: () => (this.errorRoles = true),
    });
  }

  /** Nombre legible de un rol del backend ("EDITOR" → "Editor de contenido"). */
  etiquetaRol(rol: RolApi): string {
    const nombre = rol.nombre.replace(/^ROLE_/, '');
    return esRol(nombre) ? (infoDeRol(nombre)?.nombre ?? nombre) : nombre;
  }

  /** Nombre legible del rol de una persona: el que manda el backend o, si no, el que corresponde a su rolId. */
  nombreRol(usuario: Usuario): string {
    const nombre = usuario.rolNombre?.replace(/^ROLE_/, '') ?? this.roles.find((r) => r.id === usuario.rolId)?.nombre.replace(/^ROLE_/, '');
    if (!nombre) return 'Sin rol';
    return esRol(nombre) ? (infoDeRol(nombre)?.nombre ?? nombre) : nombre;
  }

  /** Qué puede hacer el rol elegido en el formulario (el texto del backend o, si falta, el de la tabla de roles). */
  get descripcionRol(): string {
    const rol = this.roles.find((r) => r.id === this.usuarioActual.rolId);
    if (!rol) return '';
    const nombre = rol.nombre.replace(/^ROLE_/, '');
    return rol.descripcion || (esRol(nombre) ? (infoDeRol(nombre)?.descripcion ?? '') : '');
  }

  // Requisitos de contraseña (mismos que exige el backend al crear)
  get pass(): string {
    return this.usuarioActual.password ?? '';
  }
  get tieneLongitudMinima(): boolean {
    return this.pass.length >= 8;
  }
  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.pass);
  }
  get tieneMinuscula(): boolean {
    return /[a-z]/.test(this.pass);
  }
  get tieneNumero(): boolean {
    return /[0-9]/.test(this.pass);
  }
  get tieneEspecial(): boolean {
    return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(this.pass);
  }
  get esPasswordValida(): boolean {
    return (
      this.tieneLongitudMinima &&
      this.tieneMayuscula &&
      this.tieneMinuscula &&
      this.tieneNumero &&
      this.tieneEspecial
    );
  }
  get mostrarRequisitos(): boolean {
    return this.pass.length > 0;
  }

  private usuarioVacio(): Usuario {
    return {
      rolId: 0, // se elige en el formulario (el id lo entrega el backend)
      nombreCompleto: '',
      correo: '',
      password: '',
      activo: true,
    };
  }

  cargarAdmins(): void {
    this.usuarioService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => (this.listaAdmins = data),
      error: (err) => {
        console.error('Error al cargar administradores', err);
        this.toastService.showError('No se pudieron cargar los administradores.');
      },
    });
  }

  abrirModalCrear(): void {
    this.esEdicion = false;
    this.errorForm = '';
    this.verPassword = false;
    this.usuarioActual = this.usuarioVacio();
    // Por defecto el rol con menos permisos que haya (Editor, o el primero de la lista)
    this.usuarioActual.rolId = (this.roles.find((r) => r.nombre.replace(/^ROLE_/, '') === 'EDITOR') ?? this.roles[0])?.id ?? 0;
    this.modalAbierto = true;
  }

  abrirModalEditar(admin: Usuario): void {
    this.esEdicion = true;
    this.errorForm = '';
    this.verPassword = false;
    // La contraseña se deja vacía: solo se cambia si el admin escribe una nueva
    this.usuarioActual = { ...admin, password: '' };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    clearTimeout(this.timerMensaje);
    this.timerMensaje = setTimeout(() => (this.mensajeExito = ''), 4000);
  }

  guardarUsuario(): void {
    const { password, ...resto } = this.usuarioActual;
    const nuevaPass = password?.trim() ?? '';

    if (!resto.nombreCompleto.trim() || !resto.correo.trim()) {
      this.errorForm = 'El nombre y el correo son obligatorios.';
      return;
    }
    if (!this.esEdicion && !nuevaPass) {
      this.errorForm = 'La contraseña es obligatoria.';
      return;
    }
    if (nuevaPass && !this.esPasswordValida) {
      this.errorForm =
        'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.';
      return;
    }
    if (!resto.rolId) {
      this.errorForm = 'Elige un rol.';
      return;
    }
    // Editar sin saber a quién: no se debe crear un administrador nuevo en su lugar
    if (this.esEdicion && !this.usuarioActual.id) {
      this.errorForm = 'No se pudo identificar al administrador que se está editando. Cierra la ventana y ábrelo de nuevo.';
      return;
    }
    this.errorForm = '';

    // Solo se envía la contraseña si el admin escribió una
    const datos: Usuario = nuevaPass ? { ...resto, password: nuevaPass } : resto;

    const peticion =
      this.esEdicion && this.usuarioActual.id
        ? this.usuarioService.actualizar(this.usuarioActual.id, datos)
        : this.usuarioService.crear(datos);


    const eraEdicion = this.esEdicion;

    peticion.subscribe({
      next: () => {
        this.cargarAdmins();
        this.cerrarModal();
        if (!eraEdicion) {
          this.mostrarExito('Administrador creado correctamente.');
        } else if (nuevaPass) {
          this.mostrarExito('Administrador actualizado y contraseña cambiada correctamente.');
        } else {
          this.mostrarExito('Administrador actualizado correctamente.');
        }
      },
      error: (err) => {
        console.error('Error al guardar', err);
        this.errorForm = this.extraerMensajeError(err);
      },
    });
  }

  /**
   * Arma un mensaje legible a partir de la respuesta de error del backend.
   * Las validaciones de campo (ej. requisitos de contraseña, correo inválido)
   * vienen en err.error.detalles como un mapa campo -> mensaje.
   */
  private extraerMensajeError(err: HttpErrorResponse): string {
    const detalles = err?.error?.detalles;
    if (detalles && typeof detalles === 'object') {
      const mensajes = (Object.values(detalles) as unknown[]).filter((m): m is string => typeof m === 'string' && m.length <= 200);
      if (mensajes.length > 0) {
        return mensajes.join(' ');
      }
    }
    return mensajeDeError(err, 'No se pudo guardar. Intenta de nuevo.');
  }

  async eliminarAdmin(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmDialog.open({
      title: 'Eliminar administrador',
      message: '¿Estás seguro de eliminar este administrador? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      type: 'danger',
    });
    if (!ok) return;
    this.usuarioService.eliminar(id).subscribe({
      next: () => {
        this.cargarAdmins();
        this.mostrarExito('Administrador eliminado correctamente.');
      },
      error: (err) => {
        console.error('Error al eliminar', err);
        this.toastService.showError(mensajeDeError(err, 'No se pudo eliminar el administrador.'));
      },
    });
  }
}
