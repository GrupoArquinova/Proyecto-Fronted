/** Rutas que no son del sitio público: el panel de administración y las pantallas de acceso. */
const RUTAS_PRIVADAS = ['/admin', '/login', '/recuperar-password', '/reset-password'];

/** La ruta sin querystring ni fragmento ("/proyectos/6/ubicacion?vista=mapa#x" → "/proyectos/6/ubicacion"). */
export function rutaSinParametros(url: string): string {
  const ruta = url.split(/[?#]/)[0] || '/';
  return ruta.startsWith('/') ? ruta : `/${ruta}`;
}

/** ¿Es una página del sitio público (no el panel ni el acceso)? */
export function esRutaPublica(url: string): boolean {
  const ruta = rutaSinParametros(url);
  return !RUTAS_PRIVADAS.some(prefijo => ruta === prefijo || ruta.startsWith(prefijo + '/'));
}

/** Id del proyecto cuando la ruta es de su micrositio ("/proyectos/6/lotes" → 6); null en cualquier otra. */
export function proyectoIdDeRuta(url: string): number | null {
  const m = rutaSinParametros(url).match(/^\/proyectos\/(\d+)(?:\/|$)/);
  return m ? Number(m[1]) : null;
}
