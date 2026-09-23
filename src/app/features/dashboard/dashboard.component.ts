import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page">
      <nav class="navbar">
        <div class="brand">Arquinova Admin</div>
        <button (click)="onLogout()" class="btn-logout">Cerrar Sesión</button>
      </nav>

      <main class="container">
        <div class="welcome-box">
          <h1>Bienvenido {{ userName }}</h1>
          <p>Has ingresado correctamente a la zona protegida del sistema de la Constructora.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-page {
      min-height: 100vh;
      background-color: #2b2e30;
      color: #ffffff;
      font-family: 'Georgia', serif;
    }
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background-color: #232628;
      border-bottom: 1px solid #3d4346;
      .brand { font-size: 1.2rem; font-weight: bold; }
      .btn-logout {
        background-color: #e11d48;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-family: sans-serif;
      }
    }
    .container {
      display: flex;
      justify-content: center;
      padding-top: 5rem;
    }
    .welcome-box {
      background-color: #36393b;
      border: 1px solid #3d4346;
      padding: 3rem;
      border-radius: 8px;
      text-align: center;
      max-width: 500px;
      h1 { color: #52a3a0; margin-bottom: 1rem; }
      p { color: #d1d5db; font-family: sans-serif; }
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userName = this.authService.getUserName();

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}