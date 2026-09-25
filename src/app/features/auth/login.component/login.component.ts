import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  correo: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  private errorTimeout: any;

  onSubmit(): void {
    if (!this.correo || !this.password) {
      this.setTemporaryError('Por favor complete todos los campos.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ correo: this.correo, password: this.password }).subscribe({
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