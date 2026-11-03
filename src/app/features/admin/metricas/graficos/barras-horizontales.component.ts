import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { anchoBarra, porcentaje } from '../../../../core/utils/metricas';

export interface ItemBarra {
  etiqueta: string;
  valor: number;
}

/**
 * Barras horizontales hechas con CSS: una fila por elemento, con su etiqueta y su valor en texto (así un lector de pantalla
 * lee los datos sin necesitar otra tabla). Con `base` muestra también el porcentaje de cada valor sobre ese total.
 */
@Component({
  selector: 'app-barras-horizontales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hayDatos()) {
      <ul class="barras" [attr.aria-label]="titulo()">
        @for (fila of filas(); track fila.etiqueta) {
          <li>
            <span class="etiqueta" [attr.title]="fila.etiqueta">{{ fila.etiqueta }}</span>
            <span class="pista" aria-hidden="true">
              <span class="barra" [style.width.%]="fila.ancho" [style.background]="color()"></span>
            </span>
            <span class="valor">{{ fila.valor }}@if (base() !== null) { <small>({{ fila.pct }}%)</small> }</span>
          </li>
        }
      </ul>
    } @else {
      <p class="vacio">{{ vacio() }}</p>
    }
  `,
  styles: `
    .barras { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    li { display: grid; grid-template-columns: minmax(80px, 34%) 1fr auto; align-items: center; gap: 0.75rem; font-size: 0.88rem; color: #1e293b; }
    .etiqueta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pista { height: 14px; background: #eef2f1; border-radius: 7px; overflow: hidden; }
    .barra { display: block; height: 100%; border-radius: 7px; }
    .valor { font-weight: 600; min-width: 2.5ch; text-align: right; font-variant-numeric: tabular-nums; }
    small { font-weight: 400; color: #64748b; }
    .vacio { margin: 0; color: #64748b; font-size: 0.9rem; }
    @media (max-width: 520px) { li { grid-template-columns: 1fr auto; } .pista { grid-column: 1 / -1; grid-row: 2; } }
  `
})
export class BarrasHorizontalesComponent {
  readonly items = input<ItemBarra[]>([]);
  readonly titulo = input('');
  readonly color = input('#2c5953');
  readonly vacio = input('Sin datos en este período.');
  /** Si se indica, cada fila muestra su porcentaje sobre este valor (por ejemplo el primer paso de un embudo). */
  readonly base = input<number | null>(null);

  readonly hayDatos = computed(() => this.items().some(i => i.valor > 0));

  readonly filas = computed(() => {
    const items = this.items();
    const maximo = Math.max(0, ...items.map(i => i.valor));
    const base = this.base();
    return items.map(i => ({
      etiqueta: i.etiqueta,
      valor: i.valor,
      ancho: anchoBarra(i.valor, maximo),
      pct: porcentaje(i.valor, base ?? 0)
    }));
  });
}
