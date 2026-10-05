import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';
import { SECCION_BENEFICIOS } from '../../../../../core/models/proyecto-detalle.models';

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  imports: [RouterLink, MedioComponent],
  templateUrl: './bienvenida.component.html',
  styleUrl: './bienvenida.component.scss'
})
export class BienvenidaComponent {
  private seccion = inicializarSeccion('bienvenida');

  readonly detalle = this.seccion.detalle;
  readonly vista = this.seccion.vista;

  readonly proyecto = computed(() => this.detalle()?.proyecto ?? null);

  readonly etiqueta = computed(() => {
    const u = this.detalle()?.ubicacion;
    return ['ARQUINOVA', u?.departamento ?? u?.ciudad].filter(Boolean).join(' · ');
  });

  /** Texto institucional con clave BENEFICIOS (lo administra el panel en "Contenido institucional"). */
  readonly beneficios = computed(() =>
    this.detalle()?.contenido.find(c => c.seccion.toUpperCase() === SECCION_BENEFICIOS) ?? null);

  readonly video = computed(() => this.detalle()?.multimedia.find(m => m.tipo === 'VIDEO') ?? null);
}
