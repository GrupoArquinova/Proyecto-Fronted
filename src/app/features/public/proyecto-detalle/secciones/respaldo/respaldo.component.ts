import { Component, computed } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { CarruselLaminasComponent } from '../carrusel-laminas/carrusel-laminas.component';

/**
 * "Respaldo" del proyecto: láminas (hechas en Canva) con los documentos y avales de ESE proyecto,
 * en un carrusel a pantalla completa. Si el proyecto no tiene láminas, la sección no aparece en el menú.
 */
@Component({
  selector: 'app-respaldo-publico',
  standalone: true,
  imports: [CarruselLaminasComponent],
  template: `
    @if (laminas().length > 0) {
      <app-carrusel-laminas [laminas]="laminas()" [alt]="'Respaldo de ' + nombre()" etiqueta="Respaldo del proyecto" />
    }
  `
})
export class RespaldoPublicoComponent {
  private seccion = inicializarSeccion('respaldo');

  readonly laminas = this.seccion.datos.respaldo;
  readonly nombre = computed(() => this.seccion.detalle()?.proyecto.nombre ?? 'el proyecto');
}
