import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { CargadorTraducciones } from './i18n/cargador-traducciones';
import { IDIOMAS, IDIOMA_BASE } from './i18n/idiomas';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor]), withFetch()),
    provideTransloco({
      config: {
        availableLangs: [...IDIOMAS],
        defaultLang: IDIOMA_BASE,
        fallbackLang: IDIOMA_BASE, // lo que no esté traducido al inglés se ve en español
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true }
      },
      loader: CargadorTraducciones
    }),
    // El español queda cargado antes de pintar la primera pantalla (también en el servidor)
    provideAppInitializer(() => inject(TranslocoService).load(IDIOMA_BASE))
  ]
};