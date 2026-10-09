import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';
import { Visor360Component } from '../visor-360/visor-360.component';
import { PlanoPuntosComponent } from '../plano-puntos/plano-puntos.component';
import { CarruselLaminasComponent } from '../carrusel-laminas/carrusel-laminas.component';
import { TarjetaPuntoComponent } from '../tarjeta-punto/tarjeta-punto.component';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { clasificarMedio, urlMapaOpenStreetMap } from '../../../../../core/utils/medios';
import { esLugarCercano } from '../../../../../core/utils/puntos';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  imports: [TranslocoPipe, MedioComponent, Visor360Component, PlanoPuntosComponent, TarjetaPuntoComponent, CarruselLaminasComponent],
  templateUrl: './ubicacion.component.html',
  styleUrl: './ubicacion.component.scss'
})
export class UbicacionComponent {
  private sanitizer = inject(DomSanitizer);
  private seccion = inicializarSeccion('ubicacion');

  readonly vista = this.seccion.vista;
  readonly ubicacion = computed(() => this.seccion.detalle()?.ubicacion ?? null);

  readonly lugar = computed(() => {
    const u = this.ubicacion();
    return u ? [u.direccion, u.ciudad, u.departamento].filter(Boolean).join(', ') : '';
  });

  /** Entorno 360° y vista aérea: una foto panorámica (visor propio, con botones por lote), un video o un tour incrustable. */
  readonly tipoEntorno = computed(() => clasificarMedio(this.ubicacion()?.recorrido360Url).tipo);
  readonly tipoAerea = computed(() => clasificarMedio(this.ubicacion()?.vistaAereaUrl).tipo);

  /** ¿Esta vista ocupa toda la pantalla? (la misma regla que usa el layout para soltar el menú encima). */
  readonly inmersiva = computed(() => this.seccion.datos.esInmersiva('ubicacion', this.vista()));

  /** Imágenes del mapa (carrusel); sin ellas se usa el mapa interactivo de las coordenadas. */
  readonly mapas = this.seccion.datos.mapas;

  readonly puntosEntorno = computed(() => this.seccion.datos.puntosDe('ENTORNO').filter(esLugarCercano));
  readonly puntosAerea = computed(() => this.seccion.datos.puntosDe('AEREA').filter(p => !esLugarCercano(p)));
  readonly puntosPlano = computed(() => this.seccion.datos.puntosDe('URBANISMO'));

  /** Mapa satelital de Google incrustado (URL armada con números o un embed oficial); null si no se puede armar. */
  readonly googleMaps = computed<SafeResourceUrl | null>(() => {
    const url = this.seccion.datos.urlGoogleMaps();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /** Botón pulsado: su tarjeta se muestra encima de la imagen. */
  readonly tarjeta = signal<Punto360 | null>(null);

  /** Mapa interactivo generado con las coordenadas; la URL se arma con números, no con texto libre. */
  readonly mapaUrl = computed<SafeResourceUrl | null>(() => {
    const u = this.ubicacion();
    if (u?.latitud == null || u?.longitud == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(urlMapaOpenStreetMap(Number(u.latitud), Number(u.longitud)));
  });

  /** Solo los botones de un lote o de una etapa abren tarjeta; los lugares cercanos son rótulos. */
  abrirPunto(punto: Punto360): void {
    if (!esLugarCercano(punto)) this.tarjeta.set(punto);
  }

  constructor() {
    // Al cambiar de vista se cierra la tarjeta que haya quedado abierta
    effect(() => {
      this.vista();
      this.tarjeta.set(null);
    });
  }
}
