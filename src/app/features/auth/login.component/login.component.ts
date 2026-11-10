import { Component, DestroyRef, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  private fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  errorMessage = signal('');
  isLoading = signal(false);

  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Al salir de la pantalla no queda pendiente el temporizador que borra el mensaje de error
    inject(DestroyRef).onDestroy(() => {
      if (this.errorTimeout) clearTimeout(this.errorTimeout);
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.setTemporaryError('Por favor complete todos los campos correctamente.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { correo, password } = this.loginForm.value;

    this.authService.login({ correo, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        // Redirige directamente a la ruta hija 'resumen' dentro del modulo 'admin'
        this.router.navigate(['/admin/resumen']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);

        // Mensajes fijos: nunca se muestra el texto que devuelva el servidor
        let msg = 'Ocurrió un error al intentar iniciar sesión.';

        if (err.status === 401) {
          msg = 'Correo o contraseña incorrectos.';
        } else if (err.status === 0) {
          msg = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else if (err.status === 429) {
          msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
        }

        this.setTemporaryError(msg);
      },
    });
  }

  private setTemporaryError(message: string): void {
    this.errorMessage.set(message);

    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.errorMessage.set('');
    }, 5000);
  }
}
