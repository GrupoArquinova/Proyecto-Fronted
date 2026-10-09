import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';

@Component({
  selector: 'app-videos-publico',
  standalone: true,
  imports: [TranslocoPipe, MedioComponent],
  templateUrl: './videos.component.html',
  styleUrl: './videos.component.scss'
})
export class VideosPublicoComponent {
  private seccion = inicializarSeccion('videos');

  readonly vista = this.seccion.vista;
  readonly proyecto = computed(() => this.seccion.detalle()?.proyecto ?? null);
  readonly comoLlegarUrl = computed(() => this.seccion.detalle()?.ubicacion?.videoComoLlegarUrl ?? null);

  /** Videos publicados del proyecto, en el orden que definió el administrador. */
  readonly videos = computed(() =>
    (this.seccion.detalle()?.multimedia ?? []).filter(m => m.tipo === 'VIDEO'));

  /** Con varios videos se elige cuál reproducir. */
  readonly seleccionado = signal(0);
  readonly video = computed(() => this.videos()[this.seleccionado()] ?? this.videos()[0] ?? null);
}
