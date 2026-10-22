/** Largo máximo de un mensaje del backend que se muestra tal cual al administrador. */
export const MAX_MENSAJE_BACKEND = 200;

/**
 * Mensaje del backend para mostrar en el panel: solo `error.mensaje` o `error.message` cuando son texto corto (hasta 200 caracteres,
 * sin saltos de línea). Cualquier otra cosa (trazas, HTML, objetos, textos largos) se reemplaza por el mensaje genérico, así un error
 * inesperado del servidor nunca vuelca detalles internos en pantalla.
 */
export function mensajeDeError(err: unknown, porDefecto: string): string {
  const cuerpo = (err as { error?: { mensaje?: unknown; message?: unknown } } | null | undefined)?.error;
  for (const candidato of [cuerpo?.mensaje, cuerpo?.message]) {
    if (typeof candidato === 'string') {
      const texto = candidato.trim();
      if (texto.length > 0 && texto.length <= MAX_MENSAJE_BACKEND && !/[\r\n]/.test(texto)) return texto;
    }
  }
  return porDefecto;
}
