import { Component, inject } from '@angular/core';

import { Router, RouterOutlet } from '@angular/router';
import { etiquetaDeRoles } from '../../../core/models/roles';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

// Sin OnPush a propósito: este componente aloja pantallas que se actualizan al recibir datos del servidor y no usan signals;
// con OnPush quedarían congeladas en "Cargando...".
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userName = this.authService.getUserName();
  correo = this.authService.getCorreo();
  /** Rol de la sesión en el chip del navbar (Admin, Comercial, Editor). */
  rolEtiqueta = etiquetaDeRoles(this.authService.roles());
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  onLogout(): void {
    this.authService.cerrarSesion().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
