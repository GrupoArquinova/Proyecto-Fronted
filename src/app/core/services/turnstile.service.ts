import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Clave del sitio de Cloudflare Turnstile. Vacía = sin captcha (el formulario se envía como siempre). */
export const TURNSTILE_SITE_KEY = new InjectionToken<string>('TURNSTILE_SITE_KEY', {
  providedIn: 'root',
  factory: () => environment.turnstileSiteKey
});

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const ID_SCRIPT = 'cf-turnstile-script';

export interface OpcionesTurnstile {
  sitekey: string;
  theme: 'light' | 'dark' | 'auto';
  size: 'normal' | 'compact' | 'flexible';
  language: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

/** Parte de la API global `window.turnstile` que usamos. */
export interface TurnstileApi {
  render(contenedor: HTMLElement, opciones: OpcionesTurnstile): string;
  reset(id: string): void;
  remove(id: string): void;
}

export interface CallbacksTurnstile {
  exito: (token: string) => void;
  expira: () => void;
  error: () => void;
}

/**
 * Carga perezosa de Cloudflare Turnstile y manejo de sus widgets. Con la clave vacía (o en el servidor) `activo` es falso:
 * no se descarga ningún script y los formularios se envían sin `captchaToken`.
 */
@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private documento = inject(DOCUMENT);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  readonly claveSitio = (inject(TURNSTILE_SITE_KEY) ?? '').trim();
  /** Hay clave y estamos en el navegador: los formularios deben mostrar el widget. */
  readonly activo = this.enNavegador && this.claveSitio !== '';

  private carga: Promise<TurnstileApi | null> | null = null;

  private api(): TurnstileApi | null {
    return (this.documento.defaultView as unknown as { turnstile?: TurnstileApi } | null)?.turnstile ?? null;
  }

  /** Descarga el script una sola vez (idempotente). Resuelve `null` si no hay clave o la descarga falla. */
  cargarScript(): Promise<TurnstileApi | null> {
    if (!this.activo) return Promise.resolve(null);
    const existente = this.api();
    if (existente) return Promise.resolve(existente);
    if (this.carga) return this.carga;

    this.carga = new Promise<TurnstileApi | null>(resolve => {
      let script = this.documento.getElementById(ID_SCRIPT) as HTMLScriptElement | null;
      if (!script) {
        script = this.documento.createElement('script');
        script.id = ID_SCRIPT;
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        this.documento.head.appendChild(script);
      }
      script.addEventListener('load', () => resolve(this.api()));
      script.addEventListener('error', () => {
        script?.remove();
        this.carga = null; // permite reintentar al montar otro formulario
        resolve(null);
      });
    });
    return this.carga;
  }

  /** Dibuja el widget en el contenedor. Resuelve el id del widget, o `null` si no se pudo. */
  async renderizar(contenedor: HTMLElement, callbacks: CallbacksTurnstile,
    opciones: { idioma: string; tema?: 'light' | 'dark' | 'auto' }): Promise<string | null> {
    const api = await this.cargarScript();
    if (!api) { callbacks.error(); return null; }
    try {
      return api.render(contenedor, {
        sitekey: this.claveSitio,
        theme: opciones.tema ?? 'light', // el sitio es claro
        size: 'normal',
        language: opciones.idioma,
        callback: callbacks.exito,
        'expired-callback': callbacks.expira,
        'error-callback': callbacks.error
      });
    } catch {
      callbacks.error();
      return null;
    }
  }

  /** Vuelve a pedir el desafío (después de enviar el formulario el token ya no sirve). */
  resetear(id: string | null): void {
    if (id === null) return;
    try { this.api()?.reset(id); } catch { /* el widget ya no existe */ }
  }

  quitar(id: string | null): void {
    if (id === null) return;
    try { this.api()?.remove(id); } catch { /* el widget ya no existe */ }
  }
}
