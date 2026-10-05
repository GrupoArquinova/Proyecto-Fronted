import { Component, computed } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { SECCION_BENEFICIOS } from '../../../../../core/models/proyecto-detalle.models';

/**
 * "Respaldo": los textos institucionales publicados de la empresa (trayectoria, misión, etc.),
 * tal como los escribe el administrador en "Contenido institucional".
 */
@Component({
  selector: 'app-respaldo-publico',
  standalone: true,
  templateUrl: './respaldo.component.html',
  styleUrl: './respaldo.component.scss'
})
export class RespaldoPublicoComponent {
  private seccion = inicializarSeccion('respaldo');

  readonly proyecto = computed(() => this.seccion.detalle()?.proyecto ?? null);

  /** Beneficios ya se muestra en Bienvenida, así que no se repite aquí. */
  readonly textos = computed(() =>
    (this.seccion.detalle()?.contenido ?? []).filter(c => c.seccion.toUpperCase() !== SECCION_BENEFICIOS));
}
