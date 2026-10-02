import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../../core/models/usuario.models';
import { UsuarioService } from '../../../core/services/usuario.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  listaAdmins: Usuario[] = [];
  modalAbierto = false;
  esEdicion = false;
  verPassword = false;
  errorForm = '';
  mensajeExito = '';
  private timerMensaje?: ReturnType<typeof setTimeout>;

  usuarioActual: Usuario = this.usuarioVacio();

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.cargarAdmins();
  }

  // Requisitos de contraseña (mismos que exige el backend al crear)
  get pass(): string {
    return this.usuarioActual.password ?? '';
  }
  get tieneLongitudMinima(): boolean { return this.pass.length >= 8; }
  get tieneMayuscula(): boolean { return /[A-Z]/.test(this.pass); }
  get tieneMinuscula(): boolean { return /[a-z]/.test(this.pass); }
  get tieneNumero(): boolean { return /[0-9]/.test(this.pass); }
  get tieneEspecial(): boolean { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.pass); }
  get esPasswordValida(): boolean {
    return this.tieneLongitudMinima && this.tieneMayuscula && this.tieneMinuscula &&
           this.tieneNumero && this.tieneEspecial;
  }
  get mostrarRequisitos(): boolean {
    return this.pass.length > 0;
  }

  private usuarioVacio(): Usuario {
    return {
      rolId: 1, // Asumiendo ID 1 para Administrador
      nombreCompleto: '',
      correo: '',
      password: '',
      activo: true
    };
  }

  cargarAdmins(): void {
    this.usuarioService.listar().subscribe({
      next: (data) => (this.listaAdmins = data),
      error: (err) => console.error('Error al cargar administradores', err)
    });
  }

  abrirModalCrear(): void {
    this.esEdicion = false;
    this.errorForm = '';
    this.verPassword = false;
    this.usuarioActual = this.usuarioVacio();
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
      this.errorForm = 'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.';
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
      }
    });
  }

  /**
   * Arma un mensaje legible a partir de la respuesta de error del backend.
   * Las validaciones de campo (ej. requisitos de contraseña, correo inválido)
   * vienen en err.error.detalles como un mapa campo -> mensaje.
   */
  private extraerMensajeError(err: any): string {
    const detalles = err?.error?.detalles;
    if (detalles && typeof detalles === 'object') {
      const mensajes = Object.values(detalles) as string[];
      if (mensajes.length > 0) {
        return mensajes.join(' ');
      }
    }
    return err?.error?.mensaje || err?.error?.message || 'No se pudo guardar. Intenta de nuevo.';
  }

  eliminarAdmin(id?: number): void {
    if (!id) return;
    if (confirm('¿Estás seguro de eliminar este administrador?')) {
      this.usuarioService.eliminar(id).subscribe({
        next: () => {
          this.cargarAdmins();
          this.mostrarExito('Administrador eliminado correctamente.');
        },
        error: (err) => console.error('Error al eliminar', err)
      });
    }
  }
}