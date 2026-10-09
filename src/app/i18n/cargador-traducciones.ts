import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { from } from 'rxjs';

/**
 * Las traducciones van dentro de la aplicación (no se piden por HTTP): así funcionan igual en el servidor (SSR),
 * en la demo estática de Vercel y sin conexión. Cada idioma se carga bajo demanda, en su propio archivo.
 */
const CARGADORES: Record<string, () => Promise<{ default: unknown }>> = {
  es: () => import('./es.json'),
  en: () => import('./en.json')
};

@Injectable({ providedIn: 'root' })
export class CargadorTraducciones implements TranslocoLoader {
  getTranslation(idioma: string) {
    const cargar = CARGADORES[idioma] ?? CARGADORES['es'];
    return from(cargar().then(modulo => modulo.default as Translation));
  }
}
