import { Component, computed } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';
import { CarruselLaminasComponent } from '../carrusel-laminas/carrusel-laminas.component';
import { SECCION_BENEFICIOS } from '../../../../../core/models/proyecto-detalle.models';

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  imports: [MedioComponent, CarruselLaminasComponent],
  templateUrl: './bienvenida.component.html',
  styleUrl: './bienvenida.component.scss'
})
export class BienvenidaComponent {
  // Sin vista elegida (clic en "Bienvenida") se muestra la portada; las demás vistas salen del submenú
  private seccion = inicializarSeccion('bienvenida', { primeraPorDefecto: false });

  readonly detalle = this.seccion.detalle;
  readonly vista = this.seccion.vista;

  readonly proyecto = computed(() => this.detalle()?.proyecto ?? null);

  readonly etiqueta = computed(() => {
    const u = this.detalle()?.ubicacion;
    return ['ARQUINOVA', u?.departamento ?? u?.ciudad].filter(Boolean).join(' · ');
  });

  /** Lámina de beneficios (imagen). Si no hay, se usa el texto institucional con clave BENEFICIOS. */
  readonly imagenBeneficios = this.seccion.datos.imagenBeneficios;
  /** Con más de una lámina de beneficios se pasan en un carrusel. */
  readonly laminasBeneficios = this.seccion.datos.laminasBeneficios;
  readonly beneficios = computed(() =>
    this.detalle()?.contenido.find(c => c.seccion.toUpperCase() === SECCION_BENEFICIOS) ?? null);

  readonly video = computed(() => this.detalle()?.multimedia.find(m => m.tipo === 'VIDEO') ?? null);

  /** Imágenes del carrusel (las del proyecto). */
  readonly galeria = this.seccion.datos.galeria;
}
