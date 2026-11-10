import { Pipe, PipeTransform, inject } from '@angular/core';
import { IdiomaService } from '../../core/services/idioma.service';

/**
 * Elige el texto según el idioma del sitio: con el sitio en inglés muestra el texto en inglés si existe; si está vacío
 * (todavía no se tradujo en el panel), muestra el español. Uso: {{ proyecto.descripcion | localizado: proyecto.descripcionEn }}
 */
@Pipe({ name: 'localizado', standalone: true, pure: false })
export class LocalizadoPipe implements PipeTransform {
  private idioma = inject(IdiomaService);

  transform(textoEs: string | null | undefined, textoEn?: string | null): string {
    return textoLocalizado(this.idioma.idioma(), textoEs, textoEn);
  }
}

/** Misma regla fuera de las plantillas (por ejemplo, para el SEO). */
export function textoLocalizado(idioma: string, textoEs: string | null | undefined, textoEn?: string | null): string {
  const ingles = (textoEn ?? '').trim();
  return idioma === 'en' && ingles ? ingles : (textoEs ?? '');
}
