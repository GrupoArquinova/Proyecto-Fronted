import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, output,
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
        <p class="mensaje" [class.aviso]="estado() !== 'pendiente'" role="status" aria-live="polite">{{ clave() | transloco }}</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .captcha { margin: 0.5rem 0; }
    .widget { min-height: 65px; }
    .mensaje { margin: 0.35rem 0 0; font-size: 0.85rem; color: #555; }
    .mensaje.aviso { color: #b3261e; }
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
  private idiomaDibujado: string | null = null;
  private destruido = false;

  constructor() {
    if (!this.activo) return;
    afterNextRender(() => void this.dibujar());
    // Si cambian el idioma del sitio, se vuelve a dibujar el widget en ese idioma
    effect(() => {
      const idioma = this.idioma.idioma();
      untracked(() => {
        if (this.widgetId !== null && idioma !== this.idiomaDibujado) {
          this.turnstile.quitar(this.widgetId);
          this.widgetId = null;
          this.cambiar('pendiente', null);
          void this.dibujar();
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

  private async dibujar(): Promise<void> {
    const contenedor = this.contenedor()?.nativeElement;
    if (!contenedor) return;
    const idioma = this.idioma.idioma();
    this.idiomaDibujado = idioma;
    const id = await this.turnstile.renderizar(contenedor, {
      exito: token => this.cambiar('verificado', token),
      expira: () => this.cambiar('expirado', null),
      error: () => this.cambiar('error', null)
    }, { idioma });
    if (this.destruido) { this.turnstile.quitar(id); return; }
    this.widgetId = id;
  }
}
