import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  private fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  errorMessage: string = '';
  isLoading: boolean = false;

  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.setTemporaryError('Por favor complete todos los campos correctamente.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { correo, password } = this.loginForm.value;

    this.authService.login({ correo, password }).subscribe({
      next: () => {
        this.isLoading = false;
        // Redirige directamente a la ruta hija 'resumen' dentro del modulo 'admin'
        this.router.navigate(['/admin/resumen']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        
        let msg = 'Ocurrió un error al intentar iniciar sesión.';

        if (err.status === 401) {
          msg = 'Correo o contraseña incorrectos.';
        } else if (err.status === 0) {
          msg = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else if (err.error?.message) {
          msg = err.error.message;
        }

        this.setTemporaryError(msg);
      }
    });
  }

  private setTemporaryError(message: string): void {
    this.errorMessage = message;

    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
}