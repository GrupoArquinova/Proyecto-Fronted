import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: '../recuperar-password/recuperar-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** El enlace del correo trae el token (?token=...): se lee y se quita de la dirección para que no quede en el historial. */
  token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  readonly llegoPorEnlace = this.token !== '';

  nuevaPassword = '';
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  mostrarPassword = false;

  // Validaciones en tiempo real para la contraseña
  constructor() {
    if (this.llegoPorEnlace) {
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  get tieneLongitudMinima(): boolean {
    return this.nuevaPassword.length >= 8;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.nuevaPassword);
  }

  get tieneMinuscula(): boolean {
    return /[a-z]/.test(this.nuevaPassword);
  }

  get tieneNumero(): boolean {
    return /[0-9]/.test(this.nuevaPassword);
  }

  get tieneEspecial(): boolean {
    return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(this.nuevaPassword);
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

  toggleMostrarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  onSubmit(): void {
    if (!this.token || !this.esPasswordValida) {
      this.errorMessage.set('Por favor completa todos los campos y cumple los requisitos de la contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService
      .restablecerPassword({
        token: this.token,
        nuevaPassword: this.nuevaPassword,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.successMessage.set(res.mensaje || 'Contraseña actualizada con éxito.');
          setTimeout(() => this.router.navigate(['/login']), 2500);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          if (err.status === 0) {
            this.errorMessage.set('No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.');
            return;
          }
          this.errorMessage.set(err.error?.mensaje || err.error?.error || 'El enlace es inválido o ha expirado. Solicita uno nuevo.');
        },
      });
  }
}
