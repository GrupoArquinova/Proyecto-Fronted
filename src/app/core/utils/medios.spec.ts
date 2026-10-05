import { clasificarMedio, urlMapaOpenStreetMap } from './medios';

describe('clasificarMedio', () => {
  it('reconoce imagenes, videos y pdf por extension', () => {
    expect(clasificarMedio('https://x.com/a/foto.JPG?v=2').tipo).toBe('imagen');
    expect(clasificarMedio('https://x.com/a/video.mp4').tipo).toBe('video');
    expect(clasificarMedio('https://x.com/a/plano.pdf').tipo).toBe('pdf');
  });

  it('trata como video las URLs de video de Cloudinary sin extension', () => {
    expect(clasificarMedio('https://res.cloudinary.com/demo/video/upload/v1/abc').tipo).toBe('video');
  });

  it('convierte enlaces de YouTube a su version incrustable', () => {
    const esperado = 'https://www.youtube-nocookie.com/embed/abc123';
    expect(clasificarMedio('https://www.youtube.com/watch?v=abc123')).toEqual({ tipo: 'incrustado', embedUrl: esperado });
    expect(clasificarMedio('https://youtu.be/abc123')).toEqual({ tipo: 'incrustado', embedUrl: esperado });
    expect(clasificarMedio('https://youtube.com/shorts/abc123').embedUrl).toBe(esperado);
  });

  it('convierte enlaces de Vimeo', () => {
    expect(clasificarMedio('https://vimeo.com/123456').embedUrl).toBe('https://player.vimeo.com/video/123456');
  });

  it('solo incrusta Google Maps cuando es una URL embed', () => {
    expect(clasificarMedio('https://www.google.com/maps/embed?pb=abc').tipo).toBe('incrustado');
    expect(clasificarMedio('https://www.google.com/maps/place/Tunja').tipo).toBe('enlace');
    expect(clasificarMedio('https://goo.gl/maps/xyz').tipo).toBe('enlace');
  });

  it('nunca incrusta hosts desconocidos ni URLs sin https', () => {
    expect(clasificarMedio('https://sitio-raro.com/tour').tipo).toBe('enlace');
    expect(clasificarMedio('http://my.matterport.com/show/?m=1').tipo).toBe('enlace');
    expect(clasificarMedio('javascript:alert(1)').tipo).toBe('enlace');
    expect(clasificarMedio('no es una url').tipo).toBe('enlace');
    expect(clasificarMedio(null).tipo).toBe('enlace');
  });

  it('incrusta tours de hosts permitidos', () => {
    expect(clasificarMedio('https://my.matterport.com/show/?m=abc')).toEqual({
      tipo: 'incrustado', embedUrl: 'https://my.matterport.com/show/?m=abc'
    });
  });
});

describe('urlMapaOpenStreetMap', () => {
  it('centra el marcador en las coordenadas dadas', () => {
    const url = urlMapaOpenStreetMap(5.5, -73.3);
    expect(url).toContain('marker=5.5,-73.3');
    expect(url.startsWith('https://www.openstreetmap.org/')).toBe(true);
  });
});
