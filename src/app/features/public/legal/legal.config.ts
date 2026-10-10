import { environment } from '../../../../environments/environment';

/**
 * Datos legales de la empresa que se insertan en las páginas legales ({{campo}} del contenido).
 * Un campo vacío se muestra resaltado como "[por completar: …]" para que no se publique sin revisar.
 * Completar estos datos con los reales de la empresa (Cámara de Comercio / RUT) antes de producción.
 */
export const EMPRESA_LEGAL: Record<string, string> = {
  razonSocial: 'Grupo Arquinova S.A.S.',
  nit: '901.397.504-2',
  domicilio: 'Armenia, Quindío, Colombia',
  direccion: '', // pendiente: domicilio legal (la Carrera 14 #48N-58 es la oficina de atención comercial)
  correoDatos: environment.contacto.correo,           // confirmar: correo para asuntos de datos personales
  telefono: environment.contacto.telefonoTexto,
  sitioWeb: '',
  areaResponsable: '',
  fechaVigencia: '7 de octubre de 2026',
  licenciasProyecto: ''
};

/** Datos que cambian de forma según el idioma (la fecha). */
export const EMPRESA_LEGAL_EN: Record<string, string> = { fechaVigencia: 'October 7, 2026' };

/** Nombre de cada campo en inglés, para el aviso "[to be completed: …]". */
export const ETIQUETA_CAMPO_EN: Record<string, string> = {
  razonSocial: 'company name',
  nit: 'NIT',
  domicilio: 'domicile',
  direccion: 'address',
  correoDatos: 'email for personal data matters',
  telefono: 'phone',
  sitioWeb: 'website',
  areaResponsable: 'department or person responsible for personal data',
  fechaVigencia: 'effective date',
  licenciasProyecto: 'licenses, permits and developer registration of the project'
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
export function partesDeTexto(texto: string, idioma: string = 'es'): ParteTexto[] {
  const ingles = idioma === 'en';
  const datos = ingles ? { ...EMPRESA_LEGAL, ...EMPRESA_LEGAL_EN } : EMPRESA_LEGAL;
  const etiquetas = ingles ? ETIQUETA_CAMPO_EN : ETIQUETA_CAMPO;
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
      : { texto: `[${ingles ? 'to be completed' : 'por completar'}: ${etiquetas[m[1]] ?? m[1]}]`, pendiente: true });
    resto = resto.slice(m.index + m[0].length);
  }
  if (resto) partes.push({ texto: resto, pendiente: false });
  return partes;
}
