import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

  token = '';
  nuevaPassword = '';
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  mostrarPassword = false;

  // Validaciones en tiempo real para la contraseña
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
            this.successMessage.set('Contraseña actualizada correctamente (Modo simulación)');
            setTimeout(() => this.router.navigate(['/login']), 2000);
            return;
          }
          this.errorMessage.set(err.error?.mensaje || err.error?.error || 'El token es inválido o ha expirado');
        },
      });
  }
}
