import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, inject, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { PlanoLotesComponent } from '../plano-lotes/plano-lotes.component';
import { LoteTarjetaComponent } from '../lote-tarjeta/lote-tarjeta.component';
import { Lote } from '../../../../../core/models/lote.models';
import { ClaveEstadoLote, estadoDeLote, formatoArea } from '../../../../../core/utils/lotes';
import { IdiomaService } from '../../../../../core/services/idioma.service';

const LEYENDA: { clave: ClaveEstadoLote; etiqueta: string }[] = [
  { clave: 'disponible', etiqueta: 'Disponible' },
  { clave: 'reservado', etiqueta: 'Reservado' },
  { clave: 'vendido', etiqueta: 'Vendido' }
];

@Component({
  selector: 'app-disponibilidad-publico',
  standalone: true,
  imports: [TranslocoPipe, PlanoLotesComponent, LoteTarjetaComponent],
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.scss'
})
export class DisponibilidadPublicoComponent {
  private seccion = inicializarSeccion('disponibilidad');
  private idioma = inject(IdiomaService);

  readonly proyecto = computed(() => this.seccion.detalle()?.proyecto ?? null);
  readonly plano = this.seccion.datos.imagenPlano;

  /** La vista activa es el id de la etapa elegida en el menú. */
  readonly etapaId = computed(() => Number(this.seccion.vista()));

  readonly etapaNombre = computed(() =>
    this.seccion.datos.secciones()
      .find(s => s.id === 'disponibilidad')?.subsecciones
      .find(v => v.id === this.seccion.vista())?.titulo ?? '');

  readonly lotesDeEtapa = computed(() =>
    (this.seccion.detalle()?.lotes ?? []).filter(l => l.etapaId === this.etapaId()));

  /** Conteo por estado de la etapa, para la leyenda. */
  readonly leyenda = computed(() =>
    LEYENDA.map(item => ({
      ...item,
      total: this.lotesDeEtapa().filter(l => estadoDeLote(l).clave === item.clave).length
    })));

  /** Lote abierto en la ficha; solo vale si pertenece a la etapa que se está viendo. */
  private elegidoId = signal<number | null>(null);
  readonly elegido = computed(() => this.lotesDeEtapa().find(l => l.id === this.elegidoId()) ?? null);

  clave(lote: Lote): ClaveEstadoLote {
    return estadoDeLote(lote).clave;
  }

  area(lote: Lote): string {
    return formatoArea(lote.areaM2, this.idioma.idioma());
  }

  elegir(lote: Lote): void {
    this.elegidoId.set(this.elegidoId() === lote.id ? null : (lote.id ?? null));
  }
}
