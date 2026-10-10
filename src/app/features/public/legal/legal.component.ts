import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import contenido from './legal-contenido.json';
import contenidoEn from './legal-contenido.en.json';
import { TranslocoPipe } from '@jsverse/transloco';
import { IdiomaService } from '../../../core/services/idioma.service';
import { partesDeTexto } from './legal.config';
import { SeoService } from '../../../core/services/seo.service';

interface SeccionLegal {
  titulo: string;
  parrafos?: string[];
  items?: string[];
  parrafos2?: string[];
}
interface DocumentoLegal {
  titulo: string;
  corto: string;
  resumen: string;
  secciones: SeccionLegal[];
}

const DOCUMENTOS = contenido as unknown as Record<string, DocumentoLegal>;
const DOCUMENTOS_EN = contenidoEn as unknown as Record<string, DocumentoLegal>;

/** Páginas legales del sitio (política de datos, términos, cookies, avisos), con el contenido de legal-contenido.json. */
@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent {
  private ruta = inject(ActivatedRoute);
  private seo = inject(SeoService);
  readonly idioma = inject(IdiomaService);

  private slug = toSignal(this.ruta.paramMap.pipe(map(p => p.get('slug') ?? '')), { initialValue: '' });

  /** Los documentos en el idioma elegido; en inglés, lo que aún no esté traducido sale en español. */
  private readonly documentos = computed(() => this.idioma.idioma() === 'en' ? { ...DOCUMENTOS, ...DOCUMENTOS_EN } : DOCUMENTOS);
  readonly documento = computed(() => this.documentos()[this.slug()] ?? null);
  readonly otros = computed(() => Object.entries(this.documentos())
    .filter(([clave]) => clave !== this.slug())
    .map(([clave, d]) => ({ clave, corto: d.corto })));

  /** Parte un texto en tramos normales y datos pendientes de completar, en el idioma elegido. */
  partes = (texto: string) => partesDeTexto(texto, this.idioma.idioma());

  constructor() {
    effect(() => {
      const d = this.documento();
      if (d) {
        this.seo.establecer({ titulo: d.titulo, descripcion: d.resumen, ruta: `/legal/${this.slug()}` });
      } else {
        this.seo.establecer({ titulo: this.idioma.t('seo.paginaNoEncontrada'), noindex: true });
      }
    });
  }
}
