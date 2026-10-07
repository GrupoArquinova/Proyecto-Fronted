import { Component, computed, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { CarruselLaminasComponent, Lamina } from '../carrusel-laminas/carrusel-laminas.component';
import { PlanoPuntosComponent } from '../plano-puntos/plano-puntos.component';
import { TarjetaPuntoComponent } from '../tarjeta-punto/tarjeta-punto.component';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { ZonaComun } from '../../../../../core/models/zona-comun.models';

/**
 * Zonas comunes, en tres vistas a pantalla completa:
 *  - Portada (sin vista elegida): la foto de la zona elegida con el título y la lista numerada de zonas.
 *  - Zonas destacadas: una imagen con un botón por zona; cada botón abre el recorrido 360° de esa zona.
 *  - Galería: carrusel con todas las imágenes de las zonas, filtrable por zona.
 */
@Component({
  selector: 'app-zonas-comunes-publico',
  standalone: true,
  imports: [CarruselLaminasComponent, PlanoPuntosComponent, TarjetaPuntoComponent],
  templateUrl: './zonas-comunes.component.html',
  styleUrl: './zonas-comunes.component.scss'
})
export class ZonasComunesPublicoComponent {
  private seccion = inicializarSeccion('zonas-comunes', { primeraPorDefecto: false });

  readonly vista = this.seccion.vista;
  readonly zonas = computed(() => this.seccion.detalle()?.zonasComunes ?? []);

  // ---------- Portada ----------
  /** Zona cuya foto se ve de fondo (índice dentro de la lista). */
  readonly seleccionada = signal(0);
  readonly zonaActiva = computed(() => this.zonas()[this.seleccionada()] ?? this.zonas()[0] ?? null);

  /** Zona cuyas imágenes se ven en el carrusel sobre la portada (null = cerrado). */
  readonly zonaAbierta = signal<number | null>(null);

  readonly laminasZonaAbierta = computed<Lamina[]>(() => {
    const id = this.zonaAbierta();
    return id === null ? [] : this.seccion.datos.imagenesZonas()
      .filter(i => i.zonaId === id)
      .map(i => ({ url: i.url, titulo: i.titulo }));
  });

  readonly nombreZonaAbierta = computed(() => this.zonas().find(z => z.id === this.zonaAbierta())?.nombre ?? '');

  /** Elige la zona y, si tiene imágenes, las abre en un carrusel con flechas. */
  elegirZona(indice: number): void {
    this.seleccionada.set(indice);
    const zona = this.zonas()[indice];
    const tiene = zona?.id != null && this.seccion.datos.imagenesZonas().some(i => i.zonaId === zona.id);
    this.zonaAbierta.set(tiene ? zona!.id! : null);
  }

  foto(zona: ZonaComun | null): string | null {
    return this.seccion.datos.fotoDeZona(zona);
  }

  // ---------- Zonas destacadas ----------
  readonly imagenFondo = this.seccion.datos.imagenZonasDestacadas;
  readonly puntos = computed(() => this.seccion.datos.puntosDe('ZONAS'));

  /** Botón pulsado: su tarjeta con el 360° de la zona se abre encima de la imagen. */
  readonly tarjeta = signal<Punto360 | null>(null);
  readonly zonaDeLaTarjeta = computed(() => {
    const id = this.tarjeta()?.zonaComunId;
    return id == null ? null : this.zonas().find(z => z.id === id) ?? null;
  });

  abrirPunto(punto: Punto360): void {
    this.tarjeta.set(punto);
  }

  // ---------- Galería ----------
  /** Filtro de la galería por zona (null = todas). */
  readonly filtroZona = signal<number | null>(null);

  readonly zonasConImagenes = computed(() => this.zonas().filter(z => (z.imagenes?.length ?? 0) > 0));

  readonly laminas = computed<Lamina[]>(() => {
    const filtro = this.filtroZona();
    return this.seccion.datos.imagenesZonas()
      .filter(i => filtro === null || i.zonaId === filtro)
      .map(i => ({
        url: i.url,
        titulo: i.titulo === i.zonaNombre ? i.zonaNombre : `${i.zonaNombre} · ${i.titulo}`
      }));
  });
}
