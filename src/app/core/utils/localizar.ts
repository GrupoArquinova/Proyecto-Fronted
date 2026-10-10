import { ProyectoDetalle } from '../models/proyecto-detalle.models';
import { Idioma } from '../../i18n/idiomas';

/** El texto en inglés si existe (y el idioma es inglés); si no, el español. */
export function elegirTexto(idioma: Idioma | string, es: string | null | undefined, en: string | null | undefined): string | undefined {
  const ingles = (en ?? '').trim();
  if (idioma === 'en' && ingles) return ingles;
  return es ?? undefined;
}

/**
 * Nombre de una etapa en el idioma elegido. Si no tiene nombre en inglés, "Etapa 01 - Río Viejo" pasa a "Stage 01 - Río Viejo":
 * el resto del nombre (un nombre propio) no se toca.
 */
export function nombreEtapa(nombre: string | null | undefined, idioma: Idioma | string, nombreEn?: string | null): string {
  const base = nombre ?? '';
  if (idioma !== 'en') return base;
  const ingles = (nombreEn ?? '').trim();
  return ingles || base.replace(/^etapa\b/i, 'Stage');
}

/**
 * Datos de un proyecto con todos sus textos en el idioma elegido: los campos de siempre (descripcion, nombre, ...) traen
 * el texto en inglés cuando existe, así las secciones del sitio no tienen que saber de idiomas. En español devuelve los
 * mismos datos sin copiarlos.
 */
export function localizarDetalle(d: ProyectoDetalle | null, idioma: Idioma | string): ProyectoDetalle | null {
  if (!d || idioma !== 'en') return d;
  return {
    ...d,
    proyecto: {
      ...d.proyecto,
      descripcion: elegirTexto(idioma, d.proyecto.descripcion, d.proyecto.descripcionEn),
      participacion: elegirTexto(idioma, d.proyecto.participacion, d.proyecto.participacionEn)
    },
    ubicacion: d.ubicacion
      ? { ...d.ubicacion, referencias: elegirTexto(idioma, d.ubicacion.referencias, d.ubicacion.referenciasEn) }
      : null,
    zonasComunes: d.zonasComunes.map(z => ({
      ...z,
      nombre: elegirTexto(idioma, z.nombre, z.nombreEn) ?? z.nombre,
      descripcion: elegirTexto(idioma, z.descripcion, z.descripcionEn) ?? z.descripcion
    })),
    casasModelo: d.casasModelo.map(c => ({ ...c, descripcion: elegirTexto(idioma, c.descripcion, c.descripcionEn) })),
    lotes: d.lotes.map(l => ({
      ...l,
      descripcion: elegirTexto(idioma, l.descripcion, l.descripcionEn),
      etapaNombre: l.etapaNombre != null ? nombreEtapa(l.etapaNombre, idioma) : l.etapaNombre
    })),
    contenido: d.contenido.map(c => ({
      ...c,
      titulo: elegirTexto(idioma, c.titulo, c.tituloEn) ?? c.titulo,
      contenido: elegirTexto(idioma, c.contenido, c.contenidoEn) ?? c.contenido
    })),
    puntos: d.puntos.map(p => ({ ...p, etapaNombre: p.etapaNombre != null ? nombreEtapa(p.etapaNombre, idioma) : p.etapaNombre }))
  };
}
