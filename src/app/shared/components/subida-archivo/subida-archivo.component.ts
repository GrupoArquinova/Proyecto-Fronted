import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ToastService } from '../../../core/services/toast.service';
import { TipoArchivo, atributoAccept, validarArchivo } from '../../../core/utils/archivos';

/**
 * Campo para subir un archivo (imagen, video o PDF) directo a Cloudinary y quedarse con su URL.
 * Valida tipo y tamaño antes de subir. Uso: <app-subida-archivo etiqueta="Portada" [tipos]="['imagen']" [(url)]="x" />
 */
@Component({
  selector: 'app-subida-archivo',
  standalone: true,
  template: `
    <div class="campo">
      <span class="etiqueta">{{ etiqueta() }}</span>

      @if (url()) {
        <div class="previa">
          @if (tipoActual() === 'imagen') {
            <img [src]="url()" [alt]="etiqueta()" />
          } @else {
            <span class="icono" aria-hidden="true">{{ tipoActual() === 'video' ? '▶' : '📄' }}</span>
          }
          <div class="info">
            <a [href]="url()" target="_blank" rel="noopener">{{ nombre() || 'Ver archivo subido' }}</a>
            <button type="button" class="quitar" (click)="quitar()">Quitar</button>
          </div>
        </div>
      } @else {
        <label class="zona" [class.ocupada]="subiendo()">
          <input type="file" [accept]="accept()" [disabled]="subiendo()" (change)="alElegir($event)" />
          @if (subiendo()) {
            <span class="spinner" aria-hidden="true"></span> Subiendo {{ nombre() }}...
          } @else {
            <span>Elegir archivo ({{ descripcionTipos() }})</span>
          }
        </label>
      }

      @if (error()) { <small class="error">{{ error() }}</small> }
      @else if (ayuda() && !url()) { <small class="ayuda">{{ ayuda() }}</small> }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .campo { display: grid; gap: 0.4rem; }
    .etiqueta { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
    .zona {
      display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      padding: 1rem; border: 2px dashed #cbd5e1; border-radius: 10px; background: #f8fafc;
      color: #475569; font-size: 0.9rem; cursor: pointer; transition: border-color 0.2s, background 0.2s;
    }
    .zona:hover { border-color: #2c5953; background: #e8f0ef; }
    .zona.ocupada { cursor: progress; opacity: 0.8; }
    .zona input { display: none; }
    .previa { display: flex; align-items: center; gap: 0.9rem; padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
    .previa img { width: 84px; height: 62px; object-fit: cover; border-radius: 8px; }
    .icono { width: 84px; height: 62px; display: grid; place-items: center; background: #e8f0ef; border-radius: 8px; font-size: 1.6rem; }
    .info { display: grid; gap: 0.2rem; min-width: 0; }
    .info a { color: #2c5953; font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .quitar { justify-self: start; padding: 0; background: none; border: none; color: #dc2626; font-size: 0.82rem; cursor: pointer; }
    .quitar:hover { text-decoration: underline; }
    small { font-size: 0.8rem; }
    .error { color: #dc2626; }
    .ayuda { color: #94a3b8; }
    .spinner { width: 16px; height: 16px; border: 2px solid #cbd5e1; border-top-color: #2c5953; border-radius: 50%; animation: g 0.8s linear infinite; }
    @keyframes g { to { transform: rotate(360deg); } }
  `]
})
export class SubidaArchivoComponent {
  private cloudinary = inject(CloudinaryService);
  private toast = inject(ToastService);

  readonly etiqueta = input.required<string>();
  readonly tipos = input<TipoArchivo[]>(['imagen']);
  readonly ayuda = input<string>('');
  /** Enlace del archivo subido (enlazable con [(url)]). */
  readonly url = model<string>('');
  /**
   * Para "agregar varios": al terminar de subir emite `subido` y se deja limpio, listo para otro archivo,
   * en vez de quedarse mostrando la previa.
   */
  readonly limpiarAlSubir = input(false);
  readonly subido = output<{ url: string; nombre: string }>();

  readonly subiendo = signal(false);
  readonly error = signal('');
  readonly nombre = signal('');

  readonly accept = computed(() => atributoAccept(this.tipos()));
  readonly descripcionTipos = computed(() =>
    this.tipos().map(t => (t === 'imagen' ? 'imagen' : t === 'video' ? 'video' : 'PDF')).join(', '));

  /** Tipo del archivo ya subido, deducido de su extensión (para elegir la previa). */
  readonly tipoActual = computed<TipoArchivo | null>(() => {
    const u = this.url().toLowerCase().split('?')[0];
    if (/\.(jpe?g|png|webp|gif|avif|svg)$/.test(u) || u.includes('/image/upload/')) return 'imagen';
    if (/\.(mp4|webm|ogv|mov)$/.test(u) || u.includes('/video/upload/')) return 'video';
    return u.endsWith('.pdf') ? 'pdf' : null;
  });

  alElegir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    const problema = validarArchivo(archivo, this.tipos());
    if (problema) {
      this.error.set(problema);
      return;
    }

    this.error.set('');
    this.nombre.set(archivo.name);
    this.subiendo.set(true);

    this.cloudinary.subirArchivo(archivo).subscribe({
      next: resultado => {
        this.subiendo.set(false);
        this.subido.emit({ url: resultado.url, nombre: archivo.name });
        if (this.limpiarAlSubir()) {
          this.nombre.set('');
        } else {
          this.url.set(resultado.url);
        }
      },
      error: err => {
        console.error('Error al subir el archivo a Cloudinary:', err);
        this.toast.showError('No se pudo subir el archivo');
        this.error.set('No se pudo subir el archivo. Inténtalo de nuevo.');
        this.nombre.set('');
        this.subiendo.set(false);
      }
    });
  }

  quitar(): void {
    this.url.set('');
    this.nombre.set('');
    this.error.set('');
  }
}
