import { environment } from '../../../../environments/environment';

/**
 * Datos legales de la empresa que se insertan en las páginas legales ({{campo}} del contenido).
 * Un campo vacío se muestra resaltado como "[por completar: …]" para que no se publique sin revisar.
 * Completar estos datos con los reales de la empresa (Cámara de Comercio / RUT) antes de producción.
 */
export const EMPRESA_LEGAL: Record<string, string> = {
  razonSocial: 'Arquinova Grupo Empresarial S.A.S.', // confirmar con el certificado de Cámara de Comercio
  nit: '',
  domicilio: 'Armenia, Quindío, Colombia',
  direccion: '',
  correoDatos: environment.contacto.correo,           // confirmar: correo para asuntos de datos personales
  telefono: environment.contacto.telefonoTexto,
  sitioWeb: '',
  areaResponsable: '',
  fechaVigencia: '7 de octubre de 2026',
  licenciasProyecto: ''
};

/** Nombre legible de cada campo, para el aviso "[por completar: …]". */
export const ETIQUETA_CAMPO: Record<string, string> = {
  razonSocial: 'razón social',
  nit: 'NIT',
  domicilio: 'domicilio',
  direccion: 'dirección',
  correoDatos: 'correo para datos personales',
  telefono: 'teléfono',
  sitioWeb: 'sitio web',
  areaResponsable: 'área o persona responsable de datos',
  fechaVigencia: 'fecha de vigencia',
  licenciasProyecto: 'licencias, permisos y registro de enajenador del proyecto'
};

export interface ParteTexto {
  texto: string;
  pendiente: boolean;
}

/** Reemplaza {{campo}} por su valor; si el campo está vacío devuelve una parte marcada como pendiente. */
export function partesDeTexto(texto: string, datos: Record<string, string> = EMPRESA_LEGAL): ParteTexto[] {
  const partes: ParteTexto[] = [];
  let resto = texto;
  const re = /\{\{(\w+)\}\}/;
  for (;;) {
    const m = re.exec(resto);
    if (!m) break;
    if (m.index > 0) partes.push({ texto: resto.slice(0, m.index), pendiente: false });
    const valor = (datos[m[1]] ?? '').trim();
    partes.push(valor
      ? { texto: valor, pendiente: false }
      : { texto: `[por completar: ${ETIQUETA_CAMPO[m[1]] ?? m[1]}]`, pendiente: true });
    resto = resto.slice(m.index + m[0].length);
  }
  if (resto) partes.push({ texto: resto, pendiente: false });
  return partes;
}
