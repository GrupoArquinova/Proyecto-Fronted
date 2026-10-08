import { Component, computed, input, output } from '@angular/core';
import { Lote } from '../../../../../core/models/lote.models';
import { estadoDeLote, posicionesEnPlano } from '../../../../../core/utils/lotes';

/**
 * Imagen del proyecto con los lotes marcados encima (color según estado). Solo se dibujan los
 * lotes que tienen posición; el resto sigue disponible en las listas de cada sección.
 */
@Component({
  selector: 'app-plano-lotes',
  standalone: true,
  template: `
    @if (imagenUrl() && marcadores().length > 0) {
      <div class="plano">
        <img [src]="imagenUrl()" alt="Plano del proyecto con la ubicación de los lotes" />
        @for (m of marcadores(); track m.lote.id) {
          <button type="button" class="marca" [class]="m.estado" [class.activa]="m.lote.id === seleccionadoId()"
                  [style.left.%]="m.x" [style.top.%]="m.y"
                  [attr.aria-label]="'Lote ' + m.lote.codigo + ', ' + m.estado"
                  (click)="seleccionar.emit(m.lote)">
            {{ m.lote.codigo }}
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .plano { position: relative; border-radius: 16px; overflow: hidden; background: rgba(42, 102, 101, 0.03); box-shadow: 0 6px 24px rgba(42, 102, 101, 0.1); }
    img { display: block; width: 100%; height: auto; }
    .marca {
      position: absolute;
      transform: translate(-50%, -50%);
      min-width: 2.2rem;
      font-family: inherit;
      padding: 0.2rem 0.55rem;
      border: 2px solid #ffffff;
      border-radius: 999px;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      transition: transform 0.15s;
    }
    .marca:hover, .marca.activa { transform: translate(-50%, -50%) scale(1.25); z-index: 2; }
    .marca.activa { outline: 3px solid #2a6665; }
    .disponible { background: #2f9e63; }
    .reservado { background: #d9951a; }
    .vendido { background: #c94a4a; }
    .otro { background: #8a8a8a; }
  `]
})
export class PlanoLotesComponent {
  readonly imagenUrl = input<string | null>(null);
  readonly lotes = input.required<Lote[]>();
  readonly seleccionadoId = input<number | null>(null);
  readonly seleccionar = output<Lote>();

  readonly marcadores = computed(() => {
    // La escala se calcula con TODOS los lotes recibidos para que no cambie al filtrar por etapa
    const posiciones = posicionesEnPlano(this.lotes());
    return this.lotes()
      .filter(l => l.id != null && posiciones.has(l.id))
      .map(l => ({ lote: l, estado: estadoDeLote(l).clave, ...posiciones.get(l.id as number)! }));
  });
}
