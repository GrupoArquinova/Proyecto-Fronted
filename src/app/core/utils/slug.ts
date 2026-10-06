/** Patrón que acepta el backend para el slug: minúsculas, números y guiones simples. */
export const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * "Condominio Campestre Los Álamos" → "condominio-campestre-los-alamos".
 * Quita tildes y símbolos, y no deja guiones al inicio, al final ni repetidos.
 */
export function generarSlug(texto: string, maximo = 200): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximo)
    .replace(/-+$/g, '');
}
