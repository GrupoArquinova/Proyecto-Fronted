import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { SubidaArchivoComponent } from '../subida-archivo/subida-archivo.component';
import { ArchivoSubido } from '../../../core/services/multimedia.service';

/**
 * Renders y planos de una tipología que todavía no se ha guardado: se suben a Cloudinary al elegirlos y quedan en la lista
 * hasta que la tipología se crea; entonces quien la usa los asocia (MultimediaService.guardarArchivosDeTipologia).
 */
@Component({
  selector: 'app-archivos-tipologia',
  standalone: true,
  imports: [SubidaArchivoComponent],
  template: `
    <div class="grupo">
      <span class="titulo">Imágenes de la tipología (renders)</span>
      <ul class="miniaturas">
        @for (img of imagenes(); track img.url) {
          <li>
            <img [src]="img.url" [alt]="img.nombre" />
            <button type="button" (click)="quitar('imagenes', img)" aria-label="Quitar imagen">&times;</button>
          </li>
        }
      </ul>
      <app-subida-archivo etiqueta="Agregar imágenes" [tipos]="['imagen']" [multiple]="true" [limpiarAlSubir]="true"
                          (subido)="agregar('imagenes', $event)" />
    </div>

    <div class="grupo">
      <span class="titulo">Planos (se pueden subir varios, por ejemplo uno por planta)</span>
      <ul class="miniaturas">
        @for (plano of planos(); track plano.url) {
          <li>
            <img [src]="plano.url" [alt]="plano.nombre" />
            <span>{{ plano.nombre }}</span>
            <button type="button" (click)="quitar('planos', plano)" aria-label="Quitar plano">&times;</button>
          </li>
        }
      </ul>
      <app-subida-archivo etiqueta="Agregar planos" [tipos]="['imagen', 'pdf']" [multiple]="true" [limpiarAlSubir]="true"
                          (subido)="agregar('planos', $event)" />
    </div>
  `,
  styles: [`
    :host { display: grid; gap: 1rem; margin-top: 0.4rem; }
    .titulo { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; font-weight: 600; color: #1e293b; }
    .miniaturas { list-style: none; margin: 0 0 0.6rem; padding: 0; display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .miniaturas:empty { display: none; }
    li { position: relative; width: 110px; font-size: 0.72rem; color: #64748b; }
    li img { display: block; width: 100%; height: 78px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
    li span { display: block; margin-top: 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    li button {
      position: absolute; top: 3px; right: 3px; width: 22px; height: 22px; border: none; border-radius: 50%;
      background: rgba(15, 23, 42, 0.75); color: #fff; font-size: 1rem; line-height: 1; cursor: pointer;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivosTipologiaComponent {
  readonly imagenes = model<ArchivoSubido[]>([]);
  readonly planos = model<ArchivoSubido[]>([]);

  agregar(lista: 'imagenes' | 'planos', archivo: ArchivoSubido): void {
    this[lista].update(actuales => [...actuales, archivo]);
  }

  quitar(lista: 'imagenes' | 'planos', archivo: ArchivoSubido): void {
    this[lista].update(actuales => actuales.filter(a => a !== archivo));
  }
}
