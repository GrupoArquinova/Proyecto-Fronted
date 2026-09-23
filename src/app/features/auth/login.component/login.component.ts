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

  correo: string = 'admin@arquinova.com';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    if (!this.correo || !this.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ correo: this.correo, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      // Corregido: tipado explícito (err: HttpErrorResponse)
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 0 || err.status === 404) {
          // Simulación de acceso durante pruebas locales si el backend no está activo
          localStorage.setItem('jwt_token', 'mock_token_juan');
          localStorage.setItem('user_name', 'admin Juan');
          this.router.navigate(['/admin/dashboard']);
          return;
        }
        this.errorMessage = err.error?.message || 'Credenciales incorrectas';
      }
    });
  }
}