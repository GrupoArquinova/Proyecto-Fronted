import { TranslocoPipe } from '@jsverse/transloco';
import { Component, input, output } from '@angular/core';
import { Punto360 } from '../../../../../core/models/punto-360.models';

/** Posición sobre el plano en porcentaje (0–100) del ancho y del alto de la imagen. */
export interface PosicionPlano360 {
  x: number;
  y: number;
}

/**
 * Plano de urbanismo con botones por etapa (o lote) ubicados en porcentajes sobre la imagen, para que
 * queden en su sitio sin importar el tamaño de la pantalla. Con `completo` ocupa toda la pantalla.
 */
@Component({
  selector: 'app-plano-puntos',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './plano-puntos.component.html',
  styleUrl: './plano-puntos.component.scss',
  host: { '[class.completo]': 'completo()' }
})
export class PlanoPuntosComponent {
  readonly url = input.required<string>();
  readonly titulo = input('');
  readonly completo = input(false);
  readonly puntos = input<Punto360[]>([]);
  /** Marca temporal del editor: dónde se va a colocar un botón nuevo. */
  readonly pendiente = input<PosicionPlano360 | null>(null);

  readonly puntoElegido = output<Punto360>();
  /** Clic en un lugar libre del plano (lo usa el editor para colocar botones). */
  readonly clicEnPlano = output<PosicionPlano360>();

  elegir(punto: Punto360, evento: Event): void {
    evento.stopPropagation();
    this.puntoElegido.emit(punto);
  }

  clic(evento: MouseEvent): void {
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * 100;
    const y = ((evento.clientY - caja.top) / caja.height) * 100;
    this.clicEnPlano.emit({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }
}
