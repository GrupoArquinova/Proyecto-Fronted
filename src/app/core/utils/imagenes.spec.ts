import { describe, expect, it } from 'vitest';
import { ImagenOptimizadaPipe } from '../../shared/pipes/imagen-optimizada.pipe';
import { ANCHO_IMAGEN, optimizarImagen } from './imagenes';

describe('optimizarImagen', () => {
  it('agrega formato automático, calidad automática y ancho máximo a una imagen de Cloudinary', () => {
    expect(optimizarImagen('https://res.cloudinary.com/dn3s7utod/image/upload/v1790258444/casa.jpg', 800))
      .toBe('https://res.cloudinary.com/dn3s7utod/image/upload/f_auto,q_auto,c_limit,w_800/v1790258444/casa.jpg');
  });

  it('también funciona con carpetas y sin extensión', () => {
    expect(optimizarImagen('https://res.cloudinary.com/n/image/upload/v1/proyectos/6/fachada', ANCHO_IMAGEN.tarjeta))
      .toBe('https://res.cloudinary.com/n/image/upload/f_auto,q_auto,c_limit,w_800/v1/proyectos/6/fachada');
  });

  it('sin ancho usa 1600', () => {
    expect(optimizarImagen('https://res.cloudinary.com/n/image/upload/v1/a.png')).toContain('w_1600/');
  });

  it('no toca lo que no es una imagen de Cloudinary con la forma esperada', () => {
    for (const url of [
      'https://x.com/foto.jpg',
      'assets/images/default-project.svg',
      'https://res.cloudinary.com/n/video/upload/v1/clip.mp4',
      'https://res.cloudinary.com/n/raw/upload/v1/ficha.pdf',
      'https://res.cloudinary.com/n/image/upload/c_fill,w_100/v1/ya-transformada.jpg',
      'https://res.cloudinary.com/n/image/upload/sin-version.jpg',
      'http://res.cloudinary.com/n/image/upload/v1/a.jpg'
    ]) {
      expect(optimizarImagen(url, 800)).toBe(url);
    }
  });

  it('tolera vacío, null y undefined', () => {
    expect(optimizarImagen(null)).toBe('');
    expect(optimizarImagen(undefined)).toBe('');
    expect(optimizarImagen('')).toBe('');
  });

  it('el pipe hace lo mismo', () => {
    const pipe = new ImagenOptimizadaPipe();
    expect(pipe.transform('https://res.cloudinary.com/n/image/upload/v1/a.jpg', 400))
      .toBe('https://res.cloudinary.com/n/image/upload/f_auto,q_auto,c_limit,w_400/v1/a.jpg');
    expect(pipe.transform(null)).toBe('');
  });
});
