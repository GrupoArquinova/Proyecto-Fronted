import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { esRutaPublica, proyectoIdDeRuta, rutaSinParametros } from '../utils/rutas-publicas';

/**
 * Eventos que cuenta el navegador. FORMULARIO_ENVIADO, INICIO_CHAT y DESCARGA_BROCHURE los registra el servidor:
 * el frontend no los envía.
 */
export type TipoEventoAnalitica = 'VISTA_PAGINA' | 'VISTA_PROYECTO' | 'CLICK_WHATSAPP' | 'COMPARTIR';

/**
 * Analítica propia y mínima: avisa al backend de que pasó algo (una página vista, un clic en WhatsApp...) sin cookies, sin
 * almacenamiento del navegador y sin identificadores de la persona; el servidor solo suma contadores.
 * - Respeta "No rastrear" (Do Not Track) y el Global Privacy Control: si están activos no se envía nada.
 * - No envía desde el panel de administración ni desde el servidor (SSR).
 * - Un fallo (sin red, backend caído, CORS) se ignora en silencio: nunca afecta a la página.
 */
@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private router = inject(Router);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyRef = inject(DestroyRef);
  private readonly url = `${environment.apiUrl}/analitica/evento`;
  private ultimaVista: string | null = null;
  private escuchando = false;

  /** Empieza a contar una vista de página por cada navegación del sitio público. Se llama una vez al arrancar la app. */
  iniciar(): void {
    if (!this.enNavegador || this.escuchando) return;
    this.escuchando = true;
    const sub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(e => {
      const ruta = rutaSinParametros(e.urlAfterRedirects);
      // Cambiar solo la vista (?vista=...) de la misma página no cuenta como otra visita
      if (ruta === this.ultimaVista) return;
      this.ultimaVista = ruta;
      this.vistaPagina(ruta);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  vistaPagina(ruta?: string): void {
    this.registrar('VISTA_PAGINA', { ruta });
  }

  /** Se llama una vez por apertura de un proyecto (quien llama se encarga de no repetirlo). */
  vistaProyecto(proyectoId: number): void {
    this.registrar('VISTA_PROYECTO', { proyectoId });
  }

  /** Clic en un enlace o botón de WhatsApp; sin id de proyecto, se toma el de la página si es de un proyecto. */
  clickWhatsapp(proyectoId?: number | null): void {
    this.registrar('CLICK_WHATSAPP', { proyectoId });
  }

  compartir(proyectoId?: number | null): void {
    this.registrar('COMPARTIR', { proyectoId });
  }

  /** ¿Pidió la persona que no se le rastree? (Do Not Track o Global Privacy Control) */
  private rastreoRechazado(): boolean {
    try {
      const nav = navigator as Navigator & { msDoNotTrack?: string; globalPrivacyControl?: boolean };
      const dnt = nav.doNotTrack ?? (window as unknown as { doNotTrack?: string }).doNotTrack ?? nav.msDoNotTrack;
      return dnt === '1' || dnt === 'yes' || nav.globalPrivacyControl === true;
    } catch {
      return false;
    }
  }

  private registrar(tipo: TipoEventoAnalitica, datos: { proyectoId?: number | null; ruta?: string } = {}): void {
    if (!this.enNavegador || this.rastreoRechazado()) return;
    try {
      const rutaActual = rutaSinParametros(this.router.url);
      if (!esRutaPublica(rutaActual)) return;

      const ruta = rutaSinParametros(datos.ruta ?? rutaActual);
      const proyectoId = datos.proyectoId ?? proyectoIdDeRuta(ruta);
      const cuerpo: { tipo: TipoEventoAnalitica; proyectoId?: number; ruta: string } = { tipo, ruta };
      if (proyectoId != null) cuerpo.proyectoId = proyectoId;

      // Sin cookies ni credenciales ni referrer; keepalive deja terminar el envío aunque la persona cambie de página
      void fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true
      }).catch(() => undefined);
    } catch {
      /* la analítica nunca debe romper la página */
    }
  }
}
