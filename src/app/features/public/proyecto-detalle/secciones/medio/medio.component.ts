import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { clasificarMedio } from '../../../../../core/utils/medios';

/**
 * Muestra una URL del administrador de la forma adecuada: imagen, video, reproductor
 * (YouTube/Vimeo/tours), PDF o, si no se puede incrustar con seguridad, un enlace externo.
 */
@Component({
  selector: 'app-medio',
  standalone: true,
  host: { '[class.completo]': 'completo()' },
  template: `
    @switch (clasificado().tipo) {
      @case ('imagen') {
        <img [src]="url()" [alt]="titulo()" loading="lazy" />
      }
      @case ('video') {
        <video [src]="url()" controls preload="metadata" [attr.aria-label]="titulo()"></video>
      }
      @case ('incrustado') {
        <iframe [src]="embedSeguro()" [title]="titulo()" loading="lazy" allowfullscreen
                allow="fullscreen; autoplay; xr-spatial-tracking; gyroscope; accelerometer"
                referrerpolicy="strict-origin-when-cross-origin"></iframe>
      }
      @case ('pdf') {
        <iframe [src]="pdfSeguro()" [title]="titulo()" loading="lazy"></iframe>
        <a class="enlace" [href]="url()" target="_blank" rel="noopener">Abrir {{ titulo() }} en una pestaña nueva</a>
      }
      @default {
        <a class="enlace" [href]="url()" target="_blank" rel="noopener noreferrer">Abrir {{ titulo() }} &rarr;</a>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    img, video, iframe {
      display: block;
      width: 100%;
      border: 0;
      border-radius: 16px;
      background: rgba(44, 99, 96, 0.03);
      box-shadow: 0 6px 24px rgba(44, 99, 96, 0.1);
    }
    img { height: auto; max-height: 78vh; object-fit: contain; }
    video { max-height: 78vh; }
    iframe { aspect-ratio: 16 / 9; min-height: 320px; }
    /* A pantalla completa: sin bordes ni sombras, llena el espacio que le da el contenedor */
    :host(.completo) { height: 100%; }
    :host(.completo) img, :host(.completo) video, :host(.completo) iframe {
      width: 100%;
      height: 100%;
      max-height: none;
      min-height: 0;
      aspect-ratio: auto;
      border-radius: 0;
      box-shadow: none;
      background: #0b1413;
    }
    :host(.completo) video, :host(.completo) img { object-fit: contain; }
    .enlace {
      display: inline-block;
      margin-top: 0.9rem;
      padding: 0.8rem 1.6rem;
      background: #2c6360;
      color: #ffffff;
      border-radius: 999px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 6px 18px rgba(44, 99, 96, 0.25);
      transition: background 0.2s, transform 0.2s;
    }
    .enlace:hover { background: #3c706e; transform: translateY(-1px); }
  `]
})
export class MedioComponent {
  private sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly titulo = input<string>('el recurso');
  /** Llena todo el espacio disponible, sin bordes redondeados (video a pantalla completa). */
  readonly completo = input(false);

  readonly clasificado = computed(() => clasificarMedio(this.url()));

  /** Seguro porque clasificarMedio solo devuelve URLs https de una lista cerrada de hosts. */
  readonly embedSeguro = computed<SafeResourceUrl | null>(() => {
    const embed = this.clasificado().embedUrl;
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  /** Los PDF son https; se muestran en el visor del navegador. */
  readonly pdfSeguro = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.url()));
}
