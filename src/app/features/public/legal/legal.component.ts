import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import contenido from './legal-contenido.json';
import { partesDeTexto } from './legal.config';

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

/** Páginas legales del sitio (política de datos, términos, cookies, avisos), con el contenido de legal-contenido.json. */
@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent {
  private ruta = inject(ActivatedRoute);

  private slug = toSignal(this.ruta.paramMap.pipe(map(p => p.get('slug') ?? '')), { initialValue: '' });

  readonly documento = computed(() => DOCUMENTOS[this.slug()] ?? null);
  readonly otros = computed(() => Object.entries(DOCUMENTOS)
    .filter(([clave]) => clave !== this.slug())
    .map(([clave, d]) => ({ clave, corto: d.corto })));

  partes = partesDeTexto;
}
