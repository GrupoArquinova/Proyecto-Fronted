import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { maximoAmable } from '../../../../core/utils/metricas';

export interface PuntoSerie {
  /** Texto corto del eje horizontal ("5 oct"). */
  etiqueta: string;
  valor: number;
  /** Texto largo para la tabla y el aviso al pasar el mouse (opcional). */
  detalle?: string;
}

const ANCHO = 640;
const ALTO = 240;
const M = { izq: 40, der: 12, arr: 14, abj: 34 };

/**
 * Gráfica de una serie en SVG propio: barras verticales o línea con área. Es accesible: la imagen lleva un resumen
 * (`aria-label`) y debajo hay una tabla con los mismos datos, plegada.
 */
@Component({
  selector: 'app-grafico-serie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hayDatos()) {
      <svg class="grafico" [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" role="img" [attr.aria-label]="resumen()" preserveAspectRatio="xMidYMid meet">
        @for (t of ticks(); track t.valor) {
          <line [attr.x1]="margen.izq" [attr.x2]="ancho - margen.der" [attr.y1]="t.y" [attr.y2]="t.y" class="rejilla" />
          <text [attr.x]="margen.izq - 6" [attr.y]="t.y + 4" class="eje eje-y">{{ t.valor }}</text>
        }
        @if (tipo() === 'barras') {
          @for (p of puntos2(); track $index) {
            <rect [attr.x]="p.x - p.ancho / 2" [attr.y]="p.y" [attr.width]="p.ancho" [attr.height]="p.alto" rx="3" [attr.fill]="color()">
              <title>{{ p.titulo }}</title>
            </rect>
          }
        } @else {
          <path [attr.d]="area()" [attr.fill]="color()" fill-opacity="0.14" />
          <polyline [attr.points]="linea()" fill="none" [attr.stroke]="color()" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          @for (p of puntos2(); track $index) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" [attr.fill]="color()"><title>{{ p.titulo }}</title></circle>
          }
        }
        @for (p of puntos2(); track $index) {
          @if (p.mostrarEtiqueta) {
            <text [attr.x]="p.x" [attr.y]="alto - 12" class="eje eje-x">{{ p.etiqueta }}</text>
          }
        }
      </svg>
      <details class="tabla-alterna">
        <summary>Ver los datos en una tabla</summary>
        <table>
          <caption class="solo-lectores">{{ titulo() }}</caption>
          <thead><tr><th scope="col">{{ columnaEtiqueta() }}</th><th scope="col">{{ columnaValor() }}</th></tr></thead>
          <tbody>
            @for (p of puntos(); track $index) {
              <tr><td>{{ p.detalle || p.etiqueta }}</td><td>{{ p.valor }}</td></tr>
            }
          </tbody>
        </table>
      </details>
    } @else {
      <p class="vacio">{{ vacio() }}</p>
    }
  `,
  styles: `
    .grafico { display: block; width: 100%; height: auto; max-height: 300px; }
    .rejilla { stroke: #e2e8f0; stroke-width: 1; }
    .eje { fill: #64748b; font-size: 11px; font-family: inherit; }
    .eje-y { text-anchor: end; }
    .eje-x { text-anchor: middle; }
    .vacio { margin: 0; color: #64748b; font-size: 0.9rem; }
    .tabla-alterna { margin-top: 0.6rem; font-size: 0.85rem; color: #475569; }
    summary { cursor: pointer; padding: 0.2rem 0; }
    summary:focus-visible { outline: 2px solid #2c5953; outline-offset: 2px; }
    table { border-collapse: collapse; width: 100%; max-width: 420px; margin-top: 0.4rem; }
    th, td { text-align: left; padding: 0.3rem 0.6rem; border-bottom: 1px solid #e2e8f0; }
    td:last-child, th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .solo-lectores { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  `
})
export class GraficoSerieComponent {
  readonly puntos = input<PuntoSerie[]>([]);
  readonly tipo = input<'barras' | 'linea'>('barras');
  readonly color = input('#2c5953');
  /** Qué cuenta la serie, en plural y minúscula ("solicitudes"): se usa en el resumen de la imagen. */
  readonly unidad = input('registros');
  readonly titulo = input('');
  readonly columnaEtiqueta = input('Período');
  readonly columnaValor = input('Total');
  readonly vacio = input('Sin datos en este período.');

  readonly ancho = ANCHO;
  readonly alto = ALTO;
  readonly margen = M;

  readonly hayDatos = computed(() => this.puntos().some(p => p.valor > 0));
  private readonly maximo = computed(() => maximoAmable(Math.max(0, ...this.puntos().map(p => p.valor))));
  private readonly zonaAlto = ALTO - M.arr - M.abj;
  private readonly zonaAncho = ANCHO - M.izq - M.der;

  private y(valor: number): number {
    return M.arr + this.zonaAlto - (valor / this.maximo()) * this.zonaAlto;
  }

  readonly ticks = computed(() => {
    const max = this.maximo();
    // Los topes son 1, 2, 5 × 10^n: con 5 divisiones (o tantas como el tope si es menor) todas las marcas son enteras
    const cantidad = max < 5 ? max : 5;
    return Array.from({ length: cantidad + 1 }, (_, i) => {
      const valor = Math.round((max * i) / cantidad);
      return { valor, y: this.y(valor) };
    });
  });

  readonly puntos2 = computed(() => {
    const puntos = this.puntos();
    const n = puntos.length;
    const paso = Math.max(1, Math.ceil(n / 8)); // máximo ~8 etiquetas en el eje
    const banda = this.zonaAncho / Math.max(n, 1);
    return puntos.map((p, i) => {
      const x = this.tipo() === 'barras' ? M.izq + banda * (i + 0.5) : n === 1 ? M.izq + this.zonaAncho / 2 : M.izq + (i * this.zonaAncho) / (n - 1);
      const y = this.y(p.valor);
      return {
        x, y,
        ancho: Math.min(44, banda * 0.7),
        alto: Math.max(p.valor > 0 ? 2 : 0, M.arr + this.zonaAlto - y),
        etiqueta: p.etiqueta,
        titulo: `${p.detalle || p.etiqueta}: ${p.valor}`,
        mostrarEtiqueta: i % paso === 0
      };
    });
  });

  readonly linea = computed(() => this.puntos2().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));

  readonly area = computed(() => {
    const p = this.puntos2();
    if (!p.length) return '';
    const base = M.arr + this.zonaAlto;
    return `M${p[0].x.toFixed(1)},${base} ${p.map(q => `L${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} L${p[p.length - 1].x.toFixed(1)},${base} Z`;
  });

  readonly resumen = computed(() => {
    const puntos = this.puntos();
    const total = puntos.reduce((a, p) => a + p.valor, 0);
    const mayor = puntos.reduce((m, p) => (p.valor > m.valor ? p : m), puntos[0] ?? { etiqueta: '', valor: 0 });
    return `${this.titulo()}. Total: ${total} ${this.unidad()} en ${puntos.length} ${puntos.length === 1 ? 'punto' : 'puntos'}. El valor más alto es ${mayor.valor} (${mayor.detalle || mayor.etiqueta}).`;
  });
}
