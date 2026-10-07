import { clasificarMedio, coordenadasDeGoogleMaps, urlGoogleMapsSatelite, urlMapaOpenStreetMap } from './medios';

describe('clasificarMedio', () => {
  it('reconoce imagenes, videos y pdf por extension', () => {
    expect(clasificarMedio('https://x.com/a/foto.JPG?v=2').tipo).toBe('imagen');
    expect(clasificarMedio('https://x.com/a/video.mp4').tipo).toBe('video');
    expect(clasificarMedio('https://x.com/a/plano.pdf').tipo).toBe('pdf');
  });

  it('trata como video las URLs de video de Cloudinary sin extension', () => {
    expect(clasificarMedio('https://res.cloudinary.com/demo/video/upload/v1/abc').tipo).toBe('video');
  });

  it('trata como imagen las URLs de imagen de Cloudinary sin extension', () => {
    expect(clasificarMedio('https://res.cloudinary.com/demo/image/upload/v1/entorno360').tipo).toBe('imagen');
    expect(clasificarMedio('https://otro-host.com/image/upload/v1/entorno360').tipo).toBe('enlace');
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

describe('coordenadasDeGoogleMaps', () => {
  const casos: [string, { latitud: number; longitud: number } | null][] = [
    ['https://maps.google.com/?q=4.5388890,-75.6727780', { latitud: 4.538889, longitud: -75.672778 }],
    ['https://www.google.com/maps?ll=6.2,-75.5&z=12', { latitud: 6.2, longitud: -75.5 }],
    ['https://www.google.com/maps/place/Haras/@6.1234,-75.7654,15z/data=!3m1', { latitud: 6.1234, longitud: -75.7654 }],
    ['https://www.google.com/maps/place/Haras/data=!3d6.5!4d-75.9', { latitud: 6.5, longitud: -75.9 }],
    ['https://maps.app.goo.gl/abc123', null],
    ['https://www.google.com/maps?q=Haras+Puente+Iglesias', null],
    ['https://www.google.com/maps?q=95,-75', null],
    ['https://sitio-raro.com/?q=4.5,-75.6', null],
    ['no es una url', null]
  ];

  it.each(casos)('lee las coordenadas de %s', (url, esperado) => {
    expect(coordenadasDeGoogleMaps(url)).toEqual(esperado);
  });

  it('sin enlace no hay coordenadas', () => {
    expect(coordenadasDeGoogleMaps(null)).toBeNull();
    expect(coordenadasDeGoogleMaps('')).toBeNull();
  });
});

describe('urlGoogleMapsSatelite', () => {
  it('arma el mapa satelital con el marcador y el nombre codificado', () => {
    expect(urlGoogleMapsSatelite(4.538889, -75.672778, 'Los Andes (fase 1)')).toBe(
      'https://www.google.com/maps?q=4.538889,-75.672778(Los%20Andes%20fase%201)&t=k&z=15&output=embed');
  });

  it('sin nombre solo lleva las coordenadas', () => {
    expect(urlGoogleMapsSatelite(1, 2)).toBe('https://www.google.com/maps?q=1.000000,2.000000&t=k&z=15&output=embed');
  });
});
