import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, PLATFORM_ID, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AnaliticaService } from '../../../core/services/analitica.service';
import { IdiomaService } from '../../../core/services/idioma.service';
import { SeoService } from '../../../core/services/seo.service';
import { enlacesCompartir, urlBrochure } from '../../../core/utils/compartir';

/**
 * Botones "Compartir" y "Descargar brochure (PDF)" de un proyecto.
 * - Compartir usa el menú nativo del dispositivo (Web Share API) si existe; si no, abre un menú con WhatsApp, Facebook,
 *   X, correo y "Copiar enlace" (con confirmación para lectores de pantalla).
 * - El brochure es un enlace directo al PDF que genera el backend.
 */
@Component({
  selector: 'app-acciones-proyecto',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './acciones-proyecto.component.html',
  styleUrl: './acciones-proyecto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccionesProyectoComponent {
  private doc = inject(DOCUMENT);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private seo = inject(SeoService);
  private idioma = inject(IdiomaService);
  private analitica = inject(AnaliticaService);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly proyectoId = input.required<number>();
  readonly nombre = input.required<string>();
  /** "La Tebaida, Quindío" (opcional): se agrega al texto que se comparte. */
  readonly lugar = input<string>('');
  /** "menu" va sobre el menú lateral del micrositio; "tarjeta" en el listado de proyectos. */
  readonly variante = input<'menu' | 'tarjeta'>('tarjeta');

  readonly menuAbierto = signal(false);
  /** Mensaje de confirmación (copiado / error), anunciado a los lectores de pantalla. */
  readonly aviso = signal('');
  private temporizador?: ReturnType<typeof setTimeout>;

  readonly brochure = computed(() => urlBrochure(this.proyectoId()));
  readonly idMenu = computed(() => `compartir-menu-${this.variante()}-${this.proyectoId()}`);

  /** Dirección del proyecto: la del dominio configurado o, sin dominio (desarrollo), la del navegador. */
  private urlProyecto(): string {
    const ruta = `/proyectos/${this.proyectoId()}`;
    return this.seo.urlAbsoluta(ruta) ?? `${this.doc.location?.origin ?? ''}${ruta}`;
  }

  private datos() {
    const lugar = this.lugar();
    const nombre = this.nombre();
    return {
      titulo: this.idioma.t('acciones.asunto', { nombre }),
      texto: this.idioma.t('acciones.texto', { nombre, lugar: lugar ? ` ${this.idioma.t('proyecto.armazon.enLugar', { lugar })}` : '' }),
      url: this.urlProyecto()
    };
  }

  readonly enlaces = computed(() => {
    this.idioma.idioma(); // se recalcula al cambiar de idioma
    return enlacesCompartir(this.datos());
  });

  async compartir(): Promise<void> {
    const nav = this.enNavegador ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav && typeof nav.share === 'function') {
      try {
        const { titulo, texto, url } = this.datos();
        await nav.share({ title: titulo, text: texto, url });
        this.analitica.compartir(this.proyectoId());
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // la persona cerró el menú: no es un error
        // Cualquier otro fallo: se ofrece el menú propio
      }
    }
    this.menuAbierto.update(v => !v);
  }

  /** Se eligió una red: cuenta como compartir y cierra el menú. */
  alElegirRed(): void {
    this.analitica.compartir(this.proyectoId());
    this.menuAbierto.set(false);
  }

  async copiarEnlace(): Promise<void> {
    const url = this.urlProyecto();
    let copiado = false;
    try {
      await navigator.clipboard.writeText(url);
      copiado = true;
    } catch {
      copiado = this.copiarConTextarea(url);
    }
    if (copiado) this.analitica.compartir(this.proyectoId());
    this.mostrarAviso(this.idioma.t(copiado ? 'acciones.copiado' : 'acciones.errorCopiar'));
  }

  /** Respaldo para navegadores sin portapapeles moderno o sin permiso. */
  private copiarConTextarea(texto: string): boolean {
    try {
      const area = this.doc.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      this.doc.body.appendChild(area);
      area.select();
      const ok = this.doc.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.aviso.set(''), 4000);
  }

  @HostListener('document:keydown.escape')
  alPulsarEscape(): void {
    if (!this.menuAbierto()) return;
    this.menuAbierto.set(false);
    this.host.nativeElement.querySelector<HTMLButtonElement>('.btn-compartir')?.focus();
  }

  @HostListener('document:click', ['$event'])
  alHacerClicFuera(evento: Event): void {
    if (this.menuAbierto() && !this.host.nativeElement.contains(evento.target as Node)) this.menuAbierto.set(false);
  }
}
