import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, viewChild } from '@angular/core';

/**
 * Visor de panorámicas 360° (imagen equirectangular) con Photo Sphere Viewer.
 * Solo corre en el navegador y se carga bajo demanda para no engordar el bundle.
 */
@Component({
  selector: 'app-visor-360',
  standalone: true,
  template: `<div #contenedor class="visor" role="img" [attr.aria-label]="'Recorrido 360: ' + titulo()"></div>`,
  styles: [`
    :host { display: block; }
    .visor { width: 100%; height: min(70vh, 640px); border-radius: 16px; overflow: hidden; background: rgba(44, 99, 96, 0.03); box-shadow: 0 6px 24px rgba(44, 99, 96, 0.1); }
  `]
})
export class Visor360Component {
  readonly url = input.required<string>();
  readonly titulo = input<string>('');

  private contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      let visor: { destroy: () => void } | null = null;
      let destruido = false;

      this.destroyRef.onDestroy(() => {
        destruido = true;
        visor?.destroy();
      });

      import('@photo-sphere-viewer/core')
        .then(({ Viewer }) => {
          if (destruido) return;
          visor = new Viewer({
            container: this.contenedor().nativeElement,
            panorama: this.url(),
            navbar: ['zoom', 'move', 'fullscreen'],
            loadingTxt: 'Cargando recorrido...'
          });
        })
        .catch(err => console.error('No se pudo iniciar el visor 360:', err));
    });
  }
}
