import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarPasswordComponent {
  private authService = inject(AuthService);

  correo = '';
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  onSubmit(): void {
    if (!this.correo) {
      this.errorMessage.set('Ingresa un correo válido');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.solicitarRecuperacion({ correo: this.correo }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.mensaje);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 0) {
          this.errorMessage.set('No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.');
          return;
        }
        // Mensajes fijos: nunca se muestra el texto que devuelva el servidor
        this.errorMessage.set(err.status === 429
          ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
          : 'Error al solicitar la recuperación');
      },
    });
  }

}
