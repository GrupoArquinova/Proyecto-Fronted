import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { puedeVerSeccion } from '../../../../core/models/roles';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  @Output() logout = new EventEmitter<void>();
  @Output() navigated = new EventEmitter<void>();

  private roles = inject(AuthService).roles();

  /** ¿El rol de la sesión puede usar esta sección? El menú solo muestra lo que sí (el backend es la autoridad). */
  ve(seccion: string): boolean {
    return puedeVerSeccion(this.roles, seccion);
  }

  onNavigated(): void {
    this.navigated.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
