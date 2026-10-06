import { Component, HostListener, computed, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { ZonaComun } from '../../../../../core/models/zona-comun.models';

interface ImagenGaleria {
  url: string;
  titulo: string;
  zonaId: number;
  zonaNombre: string;
}

@Component({
  selector: 'app-zonas-comunes-publico',
  standalone: true,
  templateUrl: './zonas-comunes.component.html',
  styleUrl: './zonas-comunes.component.scss'
})
export class ZonasComunesPublicoComponent {
  private seccion = inicializarSeccion('zonas-comunes');

  readonly vista = this.seccion.vista;
  readonly zonas = computed(() => this.seccion.detalle()?.zonasComunes ?? []);

  /** Zona resaltada en "Zonas destacadas" (índice dentro de la lista). */
  readonly seleccionada = signal(0);
  readonly zonaActiva = computed(() => this.zonas()[this.seleccionada()] ?? this.zonas()[0] ?? null);

  /** Filtro de la galería por zona (null = todas) e imagen abierta en grande. */
  readonly filtroZona = signal<number | null>(null);
  readonly imagenAbierta = signal<ImagenGaleria | null>(null);

  readonly imagenes = computed<ImagenGaleria[]>(() =>
    this.zonas().flatMap(z =>
      (z.imagenes ?? []).map(i => ({
        url: i.imagenUrl,
        titulo: i.titulo || z.nombre,
        zonaId: z.id as number,
        zonaNombre: z.nombre
      }))
    )
  );

  readonly zonasConImagenes = computed(() =>
    this.zonas().filter(z => (z.imagenes?.length ?? 0) > 0));

  readonly imagenesVisibles = computed(() => {
    const filtro = this.filtroZona();
    return filtro === null ? this.imagenes() : this.imagenes().filter(i => i.zonaId === filtro);
  });

  portada(zona: ZonaComun | null): string | null {
    return zona?.imagenPrincipalUrl ?? zona?.imagenes?.[0]?.imagenUrl ?? null;
  }

  @HostListener('document:keydown.escape')
  cerrarImagen(): void {
    this.imagenAbierta.set(null);
  }
}
