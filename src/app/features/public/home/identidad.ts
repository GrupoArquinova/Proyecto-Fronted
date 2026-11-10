import { ContenidoInstitucional } from '../../../core/models/contenido.models';

/** Bloques institucionales que el inicio muestra, en este orden. Los demás textos del panel no salen en el sitio. */
const BLOQUES: { seccion: string; etiqueta: string }[] = [
  { seccion: 'MISION', etiqueta: 'Misión' },
  { seccion: 'VISION', etiqueta: 'Visión' },
  { seccion: 'VALORES', etiqueta: 'Valores' }
];

export interface BloqueIdentidad {
  /** MISION, VISION o VALORES: sirve para buscar el nombre en el idioma activo. */
  seccion: string;
  etiqueta: string;
  contenido: string;
  /** Texto en inglés, si el panel lo tiene. */
  contenidoEn?: string;
}

/**
 * Misión, visión y valores publicados, listos para mostrar. Lo que no esté publicado en el panel (o esté vacío)
 * no sale: así el interruptor "publicado" funciona como aprobación de la empresa.
 */
export function bloquesDeIdentidad(contenidos: ContenidoInstitucional[]): BloqueIdentidad[] {
  return BLOQUES
    .map(b => {
      const origen = contenidos.find(c => c.publicado && c.seccion.trim().toUpperCase() === b.seccion);
      const ingles = origen?.contenidoEn?.trim();
      return {
        seccion: b.seccion,
        etiqueta: b.etiqueta,
        contenido: origen?.contenido?.trim() ?? '',
        ...(ingles ? { contenidoEn: ingles } : {})
      };
    })
    .filter(b => b.contenido.length > 0);
}
