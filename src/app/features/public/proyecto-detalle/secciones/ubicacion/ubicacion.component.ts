import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';
import { Visor360Component } from '../visor-360/visor-360.component';
import { clasificarMedio, urlMapaOpenStreetMap } from '../../../../../core/utils/medios';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  imports: [MedioComponent, Visor360Component],
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

  /** El "recorrido 360" puede ser una foto panorámica (visor propio) o un tour externo (iframe/enlace). */
  readonly esPanorama = computed(() => clasificarMedio(this.ubicacion()?.recorrido360Url).tipo === 'imagen');

  /** Mapa interactivo generado con las coordenadas; la URL se arma con números, no con texto libre. */
  readonly mapaUrl = computed<SafeResourceUrl | null>(() => {
    const u = this.ubicacion();
    if (u?.latitud == null || u?.longitud == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(urlMapaOpenStreetMap(Number(u.latitud), Number(u.longitud)));
  });
}
