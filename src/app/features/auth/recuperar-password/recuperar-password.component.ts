import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.scss'
})
export class RecuperarPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  correo: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    if (!this.correo) {
      this.errorMessage = 'Ingresa un correo válido';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.solicitarRecuperacion({ correo: this.correo }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.mensaje;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.successMessage = 'Se envió el token a tu correo (Modo simulación)';
          return;
        }
        this.errorMessage = err.error?.mensaje || err.error?.error || 'Error al solicitar la recuperación';
      }
    });
  }

  irARestablecer(): void {
    this.router.navigate(['/reset-password']);
  }
}