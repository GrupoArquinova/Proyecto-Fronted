import { Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IdiomaService } from '../../../core/services/idioma.service';
import { IDIOMAS } from '../../../i18n/idiomas';

/**
 * Selector de idioma: dos botones, ES y EN. "claro" va sobre fondos blancos (barra del inicio); "cristal", sobre el menú
 * translúcido del micrositio.
 */
@Component({
  selector: 'app-selector-idioma',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="selector" [class.cristal]="variante() === 'cristal'" role="group" [attr.aria-label]="'comun.idioma.etiqueta' | transloco">
      @for (codigo of idiomas; track codigo) {
        <button type="button" [class.activo]="servicio.idioma() === codigo" [attr.aria-pressed]="servicio.idioma() === codigo"
                [attr.lang]="codigo" [attr.aria-label]="'comun.idioma.' + codigo | transloco"
                [title]="'comun.idioma.' + codigo | transloco" (click)="servicio.cambiar(codigo)">
          {{ codigo.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; }
    .selector {
      display: inline-flex; padding: 3px; gap: 2px; border-radius: 999px;
      background: rgba(42, 102, 101, 0.08); border: 1px solid rgba(42, 102, 101, 0.2);
    }
    button {
      min-width: 38px; padding: 0.3rem 0.65rem; border: none; border-radius: 999px; background: transparent;
      color: #2a6665; font: inherit; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; cursor: pointer;
      transition: background 0.18s, color 0.18s, transform 0.12s;
    }
    button:hover:not(.activo) { background: rgba(42, 102, 101, 0.12); }
    button:active { transform: scale(0.96); }
    button.activo { background: #2a6665; color: #fff; cursor: default; }
    .cristal { background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.28); }
    .cristal button { color: rgba(255, 255, 255, 0.85); }
    .cristal button:hover:not(.activo) { background: rgba(255, 255, 255, 0.16); }
    .cristal button.activo { background: rgba(255, 255, 255, 0.92); color: #2a6665; }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `]
})
export class SelectorIdiomaComponent {
  readonly servicio = inject(IdiomaService);
  readonly variante = input<'claro' | 'cristal'>('claro');
  readonly idiomas = IDIOMAS;
}
