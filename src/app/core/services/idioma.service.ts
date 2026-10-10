import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { CLAVE_IDIOMA, IDIOMA_BASE, Idioma, esIdioma, idiomaDelNavegador } from '../../i18n/idiomas';

/** Idioma del navegador de la persona (se puede cambiar en las pruebas). */
export const IDIOMA_DEL_NAVEGADOR = new InjectionToken<string>('IDIOMA_DEL_NAVEGADOR', {
  providedIn: 'root',
  factory: () => (typeof navigator === 'undefined' ? '' : navigator.language)
});

/**
 * Idioma del sitio público. Empieza en español (igual que lo que dibuja el servidor) y, ya en el navegador, toma el que la
 * persona eligió la última vez o, si nunca eligió, el de su navegador. Al cambiarlo se actualiza `<html lang>` y se recuerda.
 */
@Injectable({ providedIn: 'root' })
export class IdiomaService {
  private transloco = inject(TranslocoService);
  private documento = inject(DOCUMENT);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private idiomaNavegador = inject(IDIOMA_DEL_NAVEGADOR);

  private readonly actual = signal<Idioma>(IDIOMA_BASE);
  /** Idioma activo (señal de solo lectura). */
  readonly idioma = this.actual.asReadonly();
  readonly esIngles = computed(() => this.actual() === 'en');

  constructor() {
    if (this.enNavegador) {
      afterNextRender(() => this.cambiar(this.preferido(), false));
    }
  }

  /** El idioma solo pasa a ser el activo cuando ya está cargado: así ningún texto se ve un instante como clave suelta. */
  cambiar(idioma: Idioma, recordar = true): void {
    if (recordar) this.guardar(idioma);
    this.transloco.load(idioma).subscribe({
      next: () => {
        this.transloco.setActiveLang(idioma);
        this.actual.set(idioma);
        this.documento.documentElement.lang = idioma;
      },
      error: () => undefined // si no carga, se queda como está
    });
  }

  /** Traduce una clave desde el código (mensajes, títulos). Depende del idioma activo, así que sirve dentro de computed/effect. */
  t(clave: string, parametros?: Record<string, unknown>): string {
    this.actual(); // dependencia: se recalcula al cambiar de idioma
    return this.transloco.translate(clave, parametros);
  }

  private preferido(): Idioma {
    try {
      const guardado = localStorage.getItem(CLAVE_IDIOMA);
      if (esIdioma(guardado)) return guardado;
    } catch { /* almacenamiento bloqueado: se usa el del navegador */ }
    return idiomaDelNavegador(this.idiomaNavegador);
  }

  private guardar(idioma: Idioma): void {
    try { localStorage.setItem(CLAVE_IDIOMA, idioma); } catch { /* no es crítico */ }
  }
}
