import { Component, computed, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';

@Component({
  selector: 'app-casa-modelo-publico',
  standalone: true,
  imports: [MedioComponent],
  templateUrl: './casa-modelo.component.html',
  styleUrl: './casa-modelo.component.scss'
})
export class CasaModeloPublicoComponent {
  private seccion = inicializarSeccion('casa-modelo');

  readonly vista = this.seccion.vista;
  readonly casas = computed(() => this.seccion.detalle()?.casasModelo ?? []);

  /** Cuando el proyecto tiene varias casas modelo se elige cuál ver. */
  readonly seleccionada = signal(0);
  readonly casa = computed(() => this.casas()[this.seleccionada()] ?? this.casas()[0] ?? null);
}
