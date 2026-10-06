import { Component, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { formatoArea } from '../../../../../core/utils/lotes';
import { Visor360Component } from '../visor-360/visor-360.component';

/**
 * Tarjeta que se abre al pulsar un botón sobre la imagen. Muestra los datos del lote (o de la etapa) y, si el
 * lote ya tiene su propia imagen 360°, la abre ahí mismo; si no, avisa que todavía está vacía.
 */
@Component({
  selector: 'app-tarjeta-punto',
  standalone: true,
  imports: [Visor360Component],
  templateUrl: './tarjeta-punto.component.html',
  styleUrl: './tarjeta-punto.component.scss'
})
export class TarjetaPuntoComponent {
  private multimedia = inject(MultimediaService);

  readonly punto = input.required<Punto360>();
  readonly cerrar = output<void>();

  readonly esLote = computed(() => this.punto().loteId != null);
  readonly area = computed(() => formatoArea(this.punto().loteAreaM2));

  /** undefined = consultando · null = el lote no tiene imagen 360° · texto = URL de su 360°. */
  readonly panorama = toSignal(
    toObservable(this.punto).pipe(
      switchMap(punto => {
        if (punto.loteId == null) return of(null);
        return this.multimedia.listarPublicadosPorEntidad('lote', punto.loteId).pipe(
          map(recursos => recursos.find(r => r.tipo === 'PANORAMICA_360')?.url ?? null),
          catchError(() => of(null)),
          startWith(undefined)
        );
      })
    ),
    { initialValue: undefined as string | null | undefined }
  );
}
