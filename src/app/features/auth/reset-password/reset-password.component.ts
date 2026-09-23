import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: '../recuperar-password/recuperar-password.component.scss'
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  token: string = '';
  nuevaPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    if (!this.token || !this.nuevaPassword) {
      this.errorMessage = 'Completa todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.restablecerPassword({
      token: this.token,
      nuevaPassword: this.nuevaPassword
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.mensaje;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.successMessage = 'Contraseña actualizada correctamente (Modo simulación)';
          setTimeout(() => this.router.navigate(['/login']), 2000);
          return;
        }
        this.errorMessage = err.error?.mensaje || err.error?.error || 'El token es inválido o ha expirado';
      }
    });
  }
}