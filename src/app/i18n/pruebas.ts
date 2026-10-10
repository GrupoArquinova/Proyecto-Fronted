import { importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { IDIOMA_DEL_NAVEGADOR } from '../core/services/idioma.service';
import en from './en.json';
import es from './es.json';

/**
 * Para las pruebas: da a los componentes y servicios el soporte de idiomas con las traducciones reales, ya cargadas, y un
 * navegador que declara español (así el sitio arranca en español como en producción para un cliente colombiano).
 * Uso: TestBed.configureTestingModule({ providers: [provideI18nPruebas(), ...] })
 */
export const provideI18nPruebas = (idiomaNavegador = 'es-CO') => [
  importProvidersFrom(TranslocoTestingModule.forRoot({
    langs: { es, en },
    translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es', fallbackLang: 'es' },
    preloadLangs: true
  })),
  { provide: IDIOMA_DEL_NAVEGADOR, useValue: idiomaNavegador }
];
