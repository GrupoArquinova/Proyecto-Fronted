import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, output,
  signal, untracked, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IdiomaService } from '../../../core/services/idioma.service';
import { TurnstileService } from '../../../core/services/turnstile.service';

type EstadoCaptcha = 'pendiente' | 'verificado' | 'expirado' | 'error';

/**
 * Widget de Cloudflare Turnstile. Emite `token` con la prueba para el backend, o `null` cuando ya no vale (expiró, falló o
 * se reinició). Si el sitio no tiene clave no dibuja nada ni descarga el script. El formulario que lo usa debe llamar a
 * `resetear()` después de cada envío.
 */
@Component({
  selector: 'app-captcha-turnstile',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (activo) {
      <div class="captcha">
        <div #contenedor class="widget"></div>
        <p class="mensaje" [class.aviso]="estado() === 'expirado' || estado() === 'error'" [class.listo]="estado() === 'verificado'" role="status" aria-live="polite">{{ clave() | transloco }}</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .captcha { margin: 0.5rem 0; }
    .widget { min-height: 65px; }
    .mensaje { margin: 0.35rem 0 0; font-size: 0.85rem; color: #555; }
    .mensaje.aviso { color: #b3261e; }
    .mensaje.listo { color: #2e7d32; }
  `]
})
export class CaptchaTurnstileComponent {
  private turnstile = inject(TurnstileService);
  private idioma = inject(IdiomaService);
  private destroyRef = inject(DestroyRef);
  private contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');

  readonly activo = this.turnstile.activo;
  /** Token vigente, o `null` cuando se pierde. */
  readonly token = output<string | null>();

  readonly estado = signal<EstadoCaptcha>('pendiente');
  /** Clave de traducción del mensaje en vivo. */
  readonly clave = computed(() => ({
    pendiente: 'comun.captcha.confirma',
    verificado: 'comun.captcha.listo',
    expirado: 'comun.captcha.expirado',
    error: 'comun.captcha.error'
  })[this.estado()]);

  private widgetId: string | null = null;
  /** Contenedor donde está dibujado el widget: si Angular lo reemplaza (hidratación del servidor), se dibuja de nuevo. */
  private contenedorDibujado: HTMLElement | null = null;
  private idiomaDibujado: string | null = null;
  private destruido = false;

  constructor() {
    if (!this.activo) return;
    // Se dibuja en el contenedor que haya en pantalla en cada momento. Con SSR e hidratación, Angular puede crear de nuevo el
    // bloque del widget justo después de la primera pintura; si solo se dibujara una vez, el widget quedaba en un nodo ya
    // eliminado y el recuadro quedaba vacío.
    effect(() => {
      const contenedor = this.contenedor()?.nativeElement ?? null;
      untracked(() => {
        if (!contenedor || contenedor === this.contenedorDibujado) return;
        if (this.widgetId !== null) {
          this.turnstile.quitar(this.widgetId);
          this.widgetId = null;
          this.cambiar('pendiente', null);
        }
        void this.dibujar(contenedor);
      });
    });
    // Si cambian el idioma del sitio, se vuelve a dibujar el widget en ese idioma
    effect(() => {
      const idioma = this.idioma.idioma();
      untracked(() => {
        if (this.widgetId !== null && idioma !== this.idiomaDibujado) {
          this.turnstile.quitar(this.widgetId);
          this.widgetId = null;
          this.cambiar('pendiente', null);
          const contenedor = this.contenedor()?.nativeElement;
          if (contenedor) void this.dibujar(contenedor);
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      this.destruido = true;
      this.turnstile.quitar(this.widgetId);
      this.widgetId = null;
    });
  }

  /** Pide un desafío nuevo y borra el token (llamar después de enviar, con éxito o error). */
  resetear(): void {
    this.cambiar('pendiente', null);
    this.turnstile.resetear(this.widgetId);
  }

  private cambiar(estado: EstadoCaptcha, token: string | null): void {
    this.estado.set(estado);
    this.token.emit(token);
  }

  private async dibujar(contenedor: HTMLElement): Promise<void> {
    const idioma = this.idioma.idioma();
    this.idiomaDibujado = idioma;
    this.contenedorDibujado = contenedor;
    const id = await this.turnstile.renderizar(contenedor, {
      exito: token => this.cambiar('verificado', token),
      expira: () => this.cambiar('expirado', null),
      error: () => this.cambiar('error', null)
    }, { idioma });
    // Si mientras se cargaba el componente se destruyó o su contenedor fue reemplazado, el widget que se acaba de crear sobra
    if (this.destruido || this.contenedorDibujado !== contenedor) { this.turnstile.quitar(id); return; }
    this.widgetId = id;
  }
}
