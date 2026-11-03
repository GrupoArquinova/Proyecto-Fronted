import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface SegmentoBarra {
  nombre: string;
  valor: number;
  color: string;
}

export interface FilaApilada {
  etiqueta: string;
  segmentos: SegmentoBarra[];
}

/**
 * Barras horizontales apiladas (una por proyecto, dividida por estado). La escala es común a todas las filas para poder
 * compararlas. Cada fila trae un texto oculto que enumera los valores, para los lectores de pantalla.
 */
@Component({
  selector: 'app-barras-apiladas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hayDatos()) {
      <ul class="leyenda" aria-hidden="true">
        @for (n of leyenda(); track n.nombre) {
          <li><span class="muestra" [style.background]="n.color"></span>{{ n.nombre }}: <strong>{{ n.total }}</strong></li>
        }
      </ul>
      <ul class="filas" [attr.aria-label]="titulo()">
        @for (fila of filas(); track fila.etiqueta) {
          <li>
            <span class="etiqueta" [attr.title]="fila.etiqueta">{{ fila.etiqueta }}</span>
            <span class="pista" aria-hidden="true">
              @for (s of fila.segmentos; track s.nombre) {
                <span class="segmento" [style.width.%]="s.ancho" [style.background]="s.color" [attr.title]="s.nombre + ': ' + s.valor"></span>
              }
            </span>
            <span class="valor" aria-hidden="true">{{ fila.total }}</span>
            <span class="solo-lectores">{{ fila.texto }}</span>
          </li>
        }
      </ul>
    } @else {
      <p class="vacio">{{ vacio() }}</p>
    }
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; }
    .leyenda { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; margin-bottom: 0.9rem; font-size: 0.85rem; color: #475569; }
    .muestra { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 0.4rem; vertical-align: -1px; }
    .filas { display: flex; flex-direction: column; gap: 0.6rem; }
    .filas li { display: grid; grid-template-columns: minmax(80px, 34%) 1fr auto; align-items: center; gap: 0.75rem; font-size: 0.88rem; color: #1e293b; }
    .etiqueta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pista { display: flex; height: 16px; background: #eef2f1; border-radius: 8px; overflow: hidden; }
    .segmento { display: block; height: 100%; }
    .valor { font-weight: 600; min-width: 2.5ch; text-align: right; font-variant-numeric: tabular-nums; }
    .vacio { margin: 0; color: #64748b; font-size: 0.9rem; }
    .solo-lectores { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .filas li { position: relative; }
    @media (max-width: 520px) { .filas li { grid-template-columns: 1fr auto; } .pista { grid-column: 1 / -1; grid-row: 2; } }
  `
})
export class BarrasApiladasComponent {
  readonly items = input<FilaApilada[]>([]);
  readonly titulo = input('');
  readonly vacio = input('Sin datos en este período.');

  readonly hayDatos = computed(() => this.items().some(f => f.segmentos.some(s => s.valor > 0)));

  readonly filas = computed(() => {
    const items = this.items();
    const maximo = Math.max(0, ...items.map(f => f.segmentos.reduce((a, s) => a + s.valor, 0)));
    return items.map(f => {
      const total = f.segmentos.reduce((a, s) => a + s.valor, 0);
      return {
        etiqueta: f.etiqueta,
        total,
        // El ancho de cada tramo es proporcional al máximo de todas las filas
        segmentos: f.segmentos.map(s => ({ ...s, ancho: maximo > 0 ? (s.valor / maximo) * 100 : 0 })),
        texto: `${f.etiqueta}: ${f.segmentos.map(s => `${s.valor} ${s.nombre.toLowerCase()}`).join(', ')}. Total ${total}.`
      };
    });
  });

  readonly leyenda = computed(() => {
    const acumulado = new Map<string, { nombre: string; color: string; total: number }>();
    for (const f of this.items()) {
      for (const s of f.segmentos) {
        const actual = acumulado.get(s.nombre) ?? { nombre: s.nombre, color: s.color, total: 0 };
        actual.total += s.valor;
        acumulado.set(s.nombre, actual);
      }
    }
    return [...acumulado.values()];
  });

}
