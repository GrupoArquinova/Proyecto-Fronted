import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { IdiomaService } from './idioma.service';

export const NOMBRE_SITIO = 'Grupo Arquinova';

/**
 * Dirección del sitio (viene del entorno). Mientras esté vacía —demo o desarrollo, sin dominio propio— todas las
 * páginas piden a los buscadores no mostrarse, para que los datos de prueba no salgan en Google.
 */
export const SITIO_URL = new InjectionToken<string>('SITIO_URL', {
  providedIn: 'root',
  factory: () => (environment.sitioUrl ?? '').replace(/\/+$/, '')
});

/** Lo que cada página cuenta de sí misma a Google y a las redes sociales. */
export interface DatosSeo {
  /** Título de la página (se le agrega " | Grupo Arquinova"). */
  titulo?: string;
  /** Clave de traducción del título, para las páginas fijas: así cambia solo al cambiar de idioma. */
  tituloClave?: string;
  descripcion?: string;
  descripcionClave?: string;
  /** Imagen para compartir (enlace completo, por ejemplo la portada del proyecto). */
  imagen?: string | null;
  /** Ruta de la página, por ejemplo "/proyectos/6/bienvenida": sirve para la dirección canónica y para compartir. */
  ruta?: string;
  /** Pide a los buscadores no mostrar la página (login, panel, páginas que no existen). */
  noindex?: boolean;
  /** Datos estructurados (schema.org) de la página. */
  jsonLd?: Record<string, unknown> | null;
}

/** Texto en una sola línea y de máximo `max` letras, cortado en una palabra completa. */
export function recortarDescripcion(texto: string, max = 160): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${(ultimoEspacio > max * 0.6 ? corte.slice(0, ultimoEspacio) : corte).replace(/[\s.,;:]+$/, '')}…`;
}

/**
 * Pone el título, la descripción y las etiquetas para buscadores y redes sociales de cada página.
 * Con el renderizado en servidor (SSR) las etiquetas ya viajan en el HTML que recibe Google.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private titulo = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private sitioUrl = inject(SITIO_URL);
  private idioma = inject(IdiomaService);
  private ultimo: DatosSeo | null = null;

  constructor() {
    // Al cambiar de idioma se vuelve a escribir lo último que pidió la página (sus claves se traducen de nuevo)
    effect(() => {
      this.idioma.idioma();
      if (this.ultimo) this.aplicar(this.ultimo);
    });
  }

  establecer(datos: DatosSeo): void {
    this.ultimo = datos;
    this.aplicar(datos);
  }

  private aplicar(datos: DatosSeo): void {
    const tituloBase = datos.titulo ?? (datos.tituloClave ? this.idioma.t(datos.tituloClave) : '');
    const titulo = tituloBase.includes(NOMBRE_SITIO) ? tituloBase : `${tituloBase} | ${NOMBRE_SITIO}`;
    const textoDescripcion = datos.descripcion ?? (datos.descripcionClave ? this.idioma.t(datos.descripcionClave) : '');
    const descripcion = recortarDescripcion(textoDescripcion || this.idioma.t('seo.descripcionDefecto'));
    const url = datos.ruta ? this.urlAbsoluta(datos.ruta) : null;
    const imagen = datos.imagen && /^https?:\/\//i.test(datos.imagen) ? datos.imagen : null;

    this.titulo.setTitle(titulo);
    this.etiqueta('name', 'description', descripcion);
    const indexar = !datos.noindex && !!this.sitioUrl;
    this.etiqueta('name', 'robots', indexar ? 'index, follow' : 'noindex, nofollow');

    this.etiqueta('property', 'og:title', titulo);
    this.etiqueta('property', 'og:description', descripcion);
    this.etiqueta('property', 'og:type', 'website');
    this.etiqueta('property', 'og:site_name', NOMBRE_SITIO);
    this.etiqueta('property', 'og:locale', this.idioma.idioma() === 'en' ? 'en_US' : 'es_CO');
    this.etiqueta('property', 'og:url', url);
    this.etiqueta('property', 'og:image', imagen);

    this.etiqueta('name', 'twitter:card', imagen ? 'summary_large_image' : 'summary');
    this.etiqueta('name', 'twitter:title', titulo);
    this.etiqueta('name', 'twitter:description', descripcion);
    this.etiqueta('name', 'twitter:image', imagen);

    this.canonica(url);
    this.datosEstructurados(datos.jsonLd ?? null);
  }

  /** Enlace completo de una ruta, o null mientras el sitio no tenga dominio configurado (`sitioUrl`). */
  urlAbsoluta(ruta: string): string | null {
    const base = this.sitioUrl;
    return base ? `${base}${ruta.startsWith('/') ? ruta : `/${ruta}`}` : null;
  }

  /** Crea o actualiza una etiqueta; con valor vacío la quita para no dejar datos de otra página. */
  private etiqueta(tipo: 'name' | 'property', nombre: string, valor: string | null): void {
    const selector = `${tipo}="${nombre}"`;
    if (valor) this.meta.updateTag({ [tipo]: nombre, content: valor }, selector);
    else this.meta.removeTag(selector);
  }

  private canonica(url: string | null): void {
    const cabeza = this.doc.head;
    let enlace = cabeza.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      enlace?.remove();
      return;
    }
    if (!enlace) {
      enlace = this.doc.createElement('link');
      enlace.setAttribute('rel', 'canonical');
      cabeza.appendChild(enlace);
    }
    enlace.setAttribute('href', url);
  }

  private datosEstructurados(datos: Record<string, unknown> | null): void {
    const cabeza = this.doc.head;
    let script = cabeza.querySelector<HTMLScriptElement>('script#datos-estructurados');
    if (!datos) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'datos-estructurados');
      cabeza.appendChild(script);
    }
    // El "<" se escapa para que un texto del administrador no pueda cerrar la etiqueta <script>
    script.textContent = JSON.stringify(datos).replace(/</g, '\\u003c');
  }
}
