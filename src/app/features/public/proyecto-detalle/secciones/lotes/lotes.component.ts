import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { inicializarSeccion } from '../seccion.utils';
import { PlanoLotesComponent } from '../plano-lotes/plano-lotes.component';
import { LoteTarjetaComponent } from '../lote-tarjeta/lote-tarjeta.component';
import { Lote } from '../../../../../core/models/lote.models';
import { estadoDeLote, formatoArea } from '../../../../../core/utils/lotes';
import { IdiomaService } from '../../../../../core/services/idioma.service';

@Component({
  selector: 'app-lotes-publico',
  standalone: true,
  imports: [TranslocoPipe, RouterLink, PlanoLotesComponent, LoteTarjetaComponent],
  templateUrl: './lotes.component.html',
  styleUrl: './lotes.component.scss'
})
export class LotesPublicoComponent {
  private seccion = inicializarSeccion('lotes');
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private idioma = inject(IdiomaService);

  readonly datos = this.seccion.datos;
  readonly proyecto = computed(() => this.seccion.detalle()?.proyecto ?? null);
  readonly lotes = computed(() => this.seccion.detalle()?.lotes ?? []);
  readonly plano = this.seccion.datos.imagenPlano;

  /** El lote activo es la vista elegida en el menú (query param `vista` = id del lote). */
  readonly seleccionado = computed<Lote | null>(() =>
    this.lotes().find(l => String(l.id) === this.seccion.vista()) ?? this.lotes()[0] ?? null);

  readonly disponibles = computed(() =>
    this.lotes().filter(l => estadoDeLote(l).clave === 'disponible').length);

  clave(lote: Lote): string {
    return estadoDeLote(lote).clave;
  }

  area(lote: Lote): string {
    return formatoArea(lote.areaM2, this.idioma.idioma());
  }

  elegir(lote: Lote): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: lote.id },
      queryParamsHandling: 'merge'
    });
  }
}
