import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, HostListener, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Botón flotante para ver la página en pantalla completa (útil en el celular, donde la barra del navegador ocupa espacio).
 * Va debajo del botón de WhatsApp: mientras está en pantalla, la página recibe la clase "con-pantalla-completa" (ver styles.scss)
 * para subir WhatsApp. En iPhone el navegador no permite pantalla completa en páginas, y entonces el botón no se muestra.
 */
@Component({
  selector: 'app-boton-pantalla-completa',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    @if (disponible()) {
      <button type="button" class="btn-pantalla" (click)="alternar()"
              [attr.aria-label]="(activa() ? 'comun.salirPantallaCompleta' : 'comun.pantallaCompleta') | transloco"
              [title]="(activa() ? 'comun.salirPantallaCompleta' : 'comun.pantallaCompleta') | transloco">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
          @if (activa()) {
            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
          } @else {
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          }
        </svg>
      </button>
    }
  `,
  styles: [`
    .btn-pantalla {
      position: fixed;
      right: 32px;
      bottom: 25px;
      z-index: 998;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      background: rgba(42, 102, 101, 0.88);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 50%;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      transition: background 0.2s, transform 0.2s;
    }
    .btn-pantalla svg { width: 20px; height: 20px; }
    .btn-pantalla:hover { background: #3c706e; transform: scale(1.06); }
    .btn-pantalla:active { transform: scale(0.96); }
  `]
})
export class BotonPantallaCompletaComponent {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  readonly disponible = signal(false);
  readonly activa = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    // Se decide en el navegador, ya con la página pintada: así el HTML del servidor y el del cliente coinciden
    afterNextRender(() => {
      const hay = !!this.document.documentElement.requestFullscreen;
      this.disponible.set(hay);
      if (hay) {
        this.document.body.classList.add('con-pantalla-completa');
      }
    });
    const destruir = inject(DestroyRef);
    destruir.onDestroy(() => this.document.body.classList.remove('con-pantalla-completa'));
  }

  /** Se pone toda la página (no solo un componente) para que el botón de WhatsApp siga visible. */
  alternar(): void {
    const accion = this.document.fullscreenElement
      ? this.document.exitFullscreen()
      : this.document.documentElement.requestFullscreen();
    accion.catch(() => undefined);
  }

  @HostListener('document:fullscreenchange')
  sincronizar(): void {
    this.activa.set(!!this.document.fullscreenElement);
  }
}
