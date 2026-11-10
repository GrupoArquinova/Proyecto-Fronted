/** Idiomas del sitio público. El español es el idioma base: todo texto sin traducir se muestra en español. */
export type Idioma = 'es' | 'en';

export const IDIOMAS: readonly Idioma[] = ['es', 'en'];
export const IDIOMA_BASE: Idioma = 'es';
export const CLAVE_IDIOMA = 'idioma';

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor);
}

/** Idioma que le corresponde a un navegador: inglés si su idioma principal es el inglés; en cualquier otro caso, español. */
export function idiomaDelNavegador(idiomaNavegador: string | undefined | null): Idioma {
  return (idiomaNavegador ?? '').toLowerCase().startsWith('en') ? 'en' : 'es';
}
