import { Pipe, PipeTransform } from '@angular/core';
import { ANCHO_IMAGEN, optimizarImagen } from '../../core/utils/imagenes';

/**
 * Una imagen de Cloudinary liviana y en formato moderno. Uso: [src]="foto.url | imagenOptimizada: 800".
 * Sin ancho usa el "grande" (1600 px).
 */
@Pipe({ name: 'imagenOptimizada', standalone: true })
export class ImagenOptimizadaPipe implements PipeTransform {
  transform(url: string | null | undefined, ancho: number = ANCHO_IMAGEN.grande): string {
    return optimizarImagen(url, ancho);
  }
}
