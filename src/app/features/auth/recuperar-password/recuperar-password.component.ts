import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  private router = inject(Router);

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
          this.successMessage.set('Se envió el token a tu correo (Modo simulación)');
          return;
        }
        this.errorMessage.set(err.error?.mensaje || err.error?.error || 'Error al solicitar la recuperación');
      },
    });
  }

  irARestablecer(): void {
    this.router.navigate(['/reset-password']);
  }
}
