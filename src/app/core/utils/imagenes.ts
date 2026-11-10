/**
 * Pide a Cloudinary la imagen ya optimizada: formato moderno según el navegador (AVIF/WebP), calidad automática y un
 * ancho máximo. Una foto subida de 6 MB llega así en unos 100-300 KB.
 *
 * Solo toca imágenes de Cloudinary con la forma `/image/upload/v123/...` (sin transformaciones propias); cualquier otra
 * dirección —otro sitio, un archivo local, una imagen con transformaciones puestas a mano— se devuelve igual.
 * No se usa en los recorridos 360: ahí hace falta la resolución completa.
 */
const CLOUDINARY_IMAGEN = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

/** Anchos usados en el sitio: el más cercano por encima del real da una imagen nítida sin pesar de más. */
export const ANCHO_IMAGEN = { miniatura: 400, tarjeta: 800, grande: 1600, completa: 2400 } as const;

export function optimizarImagen(url: string | null | undefined, ancho: number = ANCHO_IMAGEN.grande): string {
  if (!url) return '';
  const partes = CLOUDINARY_IMAGEN.exec(url);
  if (!partes) return url;
  return `${partes[1]}f_auto,q_auto,c_limit,w_${Math.max(1, Math.round(ancho))}/${partes[2]}`;
}
