import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Multimedia } from '../../../../../core/models/multimedia.models';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { IdiomaService } from '../../../../../core/services/idioma.service';
import { formatoArea } from '../../../../../core/utils/lotes';
import { CarruselLaminasComponent, Lamina } from '../carrusel-laminas/carrusel-laminas.component';
import { Visor360Component } from '../visor-360/visor-360.component';

/**
 * Tarjeta que se abre al pulsar un botón sobre la imagen. Muestra los datos del lote, de la etapa o de la zona común
 * y, si el lote o la zona ya tiene su propia imagen 360°, la abre ahí mismo; si no, avisa que todavía está vacía.
 */
@Component({
  selector: 'app-tarjeta-punto',
  standalone: true,
  imports: [TranslocoPipe, Visor360Component, CarruselLaminasComponent],
  templateUrl: './tarjeta-punto.component.html',
  styleUrl: './tarjeta-punto.component.scss'
})
export class TarjetaPuntoComponent {
  private multimedia = inject(MultimediaService);
  private idioma = inject(IdiomaService);

  readonly punto = input.required<Punto360>();
  /** Descripción y foto de la zona común (solo cuando el botón apunta a una zona). */
  readonly descripcion = input<string | null>(null);
  readonly foto = input<string | null>(null);
  readonly cerrar = output<void>();

  readonly esLote = computed(() => this.punto().loteId != null);
  readonly esZona = computed(() => this.punto().zonaComunId != null);
  readonly esEtapa = computed(() => !this.esLote() && !this.esZona());
  readonly area = computed(() => formatoArea(this.punto().loteAreaM2, this.idioma.idioma()));

  /** undefined = consultando · null = no tiene imagen 360° · texto = URL de su 360°. */
  readonly panorama = toSignal(
    toObservable(this.punto).pipe(
      switchMap(punto => {
        const dueno = punto.zonaComunId != null
          ? { tipo: 'zonaComun' as const, id: punto.zonaComunId }
          : punto.loteId != null ? { tipo: 'lote' as const, id: punto.loteId } : null;
        if (!dueno) return of(null);
        return this.multimedia.listarPublicadosPorEntidad(dueno.tipo, dueno.id).pipe(
          map(recursos => recursos.find(r => r.tipo === 'PANORAMICA_360')?.url ?? null),
          catchError(() => of(null)),
          startWith(undefined)
        );
      })
    ),
    { initialValue: undefined as string | null | undefined }
  );

  /** Recursos publicados de la etapa (imágenes y 360°). undefined = consultando. */
  private readonly recursosEtapa = toSignal(
    toObservable(this.punto).pipe(
      switchMap(punto => {
        if (punto.etapaId == null || punto.loteId != null || punto.zonaComunId != null) return of([] as Multimedia[]);
        return this.multimedia.listarPublicadosPorEntidad('etapa', punto.etapaId).pipe(
          catchError(() => of([] as Multimedia[])),
          startWith(undefined)
        );
      })
    ),
    { initialValue: undefined as Multimedia[] | undefined }
  );

  /** Imágenes de la etapa (render de su villa, por ejemplo). undefined = consultando. */
  readonly imagenesEtapa = computed<Lamina[] | undefined>(() => this.recursosEtapa()
    ?.filter(r => r.tipo === 'IMAGEN' || r.tipo === 'PLANO')
    .map(r => ({ id: r.id, url: r.url, titulo: r.titulo }) as Lamina));

  /** Imagen 360° de la etapa: undefined = consultando · null = no tiene. */
  readonly panoramaEtapa = computed<string | null | undefined>(() => {
    const recursos = this.recursosEtapa();
    return recursos === undefined ? undefined : (recursos.find(r => r.tipo === 'PANORAMICA_360')?.url ?? null);
  });
}
