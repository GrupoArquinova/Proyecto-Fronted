/**
 * Decide cómo mostrar una URL cargada por el administrador (imagen, video, tour, PDF...).
 * Solo se incrustan (iframe) orígenes conocidos y siempre por https; cualquier otra cosa
 * se muestra como enlace externo, así una URL mal puesta nunca inyecta contenido ajeno.
 */
export type TipoMedio = 'imagen' | 'video' | 'incrustado' | 'pdf' | 'enlace';

export interface MedioClasificado {
  tipo: TipoMedio;
  /** URL lista para el iframe (solo cuando tipo === 'incrustado'). */
  embedUrl?: string;
}

const EXT_IMAGEN = /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i;
const EXT_VIDEO = /\.(mp4|webm|ogv|mov)(\?.*)?$/i;
const EXT_PDF = /\.pdf(\?.*)?$/i;

/** Hosts desde los que se permite incrustar tours, mapas y reproductores. */
const HOSTS_INCRUSTABLES = [
  'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com',
  'www.google.com', 'maps.google.com', 'www.openstreetmap.org',
  'my.matterport.com', 'kuula.co', 'www.kuula.co', 'cloudpano.com', 'tour.cloudpano.com'
];

function analizar(url: string): URL | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

function idYoutube(u: URL): string | null {
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1) || null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
    return m ? m[1] : null;
  }
  return null;
}

export function clasificarMedio(url: string | null | undefined): MedioClasificado {
  if (!url) return { tipo: 'enlace' };
  const u = analizar(url);
  if (!u) return { tipo: 'enlace' };

  const ruta = u.pathname + u.search;
  if (EXT_IMAGEN.test(ruta)) return { tipo: 'imagen' };
  if (EXT_PDF.test(ruta)) return { tipo: 'pdf' };
  // Cloudinary sirve los videos sin extensión: /video/upload/...
  if (EXT_VIDEO.test(ruta) || u.pathname.includes('/video/upload/')) return { tipo: 'video' };

  const youtube = idYoutube(u);
  if (youtube) return { tipo: 'incrustado', embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}` };

  if (u.hostname === 'vimeo.com' || u.hostname === 'www.vimeo.com') {
    const id = u.pathname.match(/^\/(\d+)/)?.[1];
    if (id) return { tipo: 'incrustado', embedUrl: `https://player.vimeo.com/video/${id}` };
  }

  // Un enlace normal de Google Maps no se puede incrustar; solo la versión /maps/embed
  if (u.hostname.endsWith('google.com') && !u.pathname.startsWith('/maps/embed')) return { tipo: 'enlace' };

  if (HOSTS_INCRUSTABLES.includes(u.hostname)) return { tipo: 'incrustado', embedUrl: u.toString() };

  return { tipo: 'enlace' };
}

/** Mapa de OpenStreetMap incrustable alrededor de unas coordenadas (no requiere clave de API). */
export function urlMapaOpenStreetMap(latitud: number, longitud: number, delta = 0.006): string {
  const bbox = [longitud - delta, latitud - delta, longitud + delta, latitud + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitud},${longitud}`;
}
