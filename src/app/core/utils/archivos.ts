export type TipoArchivo = 'imagen' | 'video' | 'pdf';

const MB = 1024 * 1024;

/** Imágenes aceptadas: lista cerrada de tipos MIME y de extensiones (el SVG queda fuera: puede llevar scripts). */
export const MIME_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'] as const;
export const EXTENSIONES_IMAGEN = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] as const;
const NOMBRES_IMAGEN = 'JPG, PNG, WebP, GIF o AVIF';

/**
 * Límites de subida. El backend no valida tipo ni tamaño (la subida va directo a Cloudinary),
 * así que se controlan aquí para no llenar la cuota por un archivo equivocado.
 */
const REGLAS: Record<TipoArchivo, { mime: RegExp; accept: string; maxMb: number; plural: string }> = {
  imagen: { mime: new RegExp(`^(${MIME_IMAGEN.join('|')})$`), accept: MIME_IMAGEN.join(','), maxMb: 10, plural: 'imágenes' },
  video: { mime: /^video\//, accept: 'video/*', maxMb: 100, plural: 'videos' },
  pdf: { mime: /^application\/pdf$/, accept: 'application/pdf', maxMb: 20, plural: 'PDF' }
};

/** Error de validación de un archivo (tipo, tamaño o contenido); su mensaje se puede mostrar tal cual al usuario. */
export class ArchivoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ArchivoInvalidoError';
  }
}

/** Mensaje para el usuario: el de la validación si el fallo fue del archivo, o el genérico si fue de la red. */
export function mensajeDeSubida(err: unknown, porDefecto: string): string {
  return err instanceof ArchivoInvalidoError ? err.message : porDefecto;
}

/** Valor para el atributo `accept` del input, por ejemplo "image/jpeg,...,application/pdf". */
export function atributoAccept(tipos: TipoArchivo[]): string {
  return tipos.map(t => REGLAS[t].accept).join(',');
}

/** Tipo de archivo de Cloudinary/Multimedia al que corresponde el File, o null si no es compatible. */
export function tipoDeArchivo(file: Pick<File, 'type'>): TipoArchivo | null {
  return (Object.keys(REGLAS) as TipoArchivo[]).find(t => REGLAS[t].mime.test(file.type)) ?? null;
}

function extensionDe(nombre: string | undefined): string | null {
  const m = nombre?.match(/\.([^./\\]+)$/);
  return m ? m[1].toLowerCase() : null;
}

function esSvg(file: Pick<File, 'type'> & { name?: string }): boolean {
  return /^image\/svg/i.test(file.type) || extensionDe(file.name) === 'svg' || extensionDe(file.name) === 'svgz';
}

/**
 * Devuelve el mensaje de error para mostrar al usuario, o null si el archivo es válido (tipo MIME, extensión y tamaño).
 * No mira el contenido: para eso está validarContenidoArchivo.
 */
export function validarArchivo(file: Pick<File, 'type' | 'size'> & { name?: string }, permitidos: TipoArchivo[]): string | null {
  if (esSvg(file)) {
    return `Los archivos SVG no se admiten por seguridad. Sube una imagen ${NOMBRES_IMAGEN}.`;
  }
  const tipo = tipoDeArchivo(file);
  if (!tipo || !permitidos.includes(tipo)) {
    const nombres = permitidos.map(t => REGLAS[t].plural).join(' o ');
    const formatos = permitidos.includes('imagen') ? ` (imágenes: ${NOMBRES_IMAGEN})` : '';
    return `Este archivo no es válido. Sube ${nombres}${formatos}.`;
  }
  if (tipo === 'imagen') {
    const ext = extensionDe(file.name);
    if (file.name && (!ext || !(EXTENSIONES_IMAGEN as readonly string[]).includes(ext))) {
      return `La extensión del archivo no es válida. Sube una imagen ${NOMBRES_IMAGEN}.`;
    }
  }
  const limite = REGLAS[tipo].maxMb;
  if (file.size > limite * MB) {
    const pesa = Math.ceil(file.size / MB);
    return `El archivo pesa ${pesa} MB y el máximo para ${REGLAS[tipo].plural} es ${limite} MB.`;
  }
  return null;
}

/** ¿Los primeros bytes son los de una imagen JPEG, PNG, GIF, WebP o AVIF? */
export function esImagenPorFirma(b: Uint8Array): boolean {
  const ascii = (desde: number, texto: string) => [...texto].every((c, i) => b[desde + i] === c.charCodeAt(0));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;                       // JPEG
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return true; // PNG
  if (b.length >= 6 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'))) return true;                           // GIF
  if (b.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) return true;                                 // WebP
  if (b.length >= 12 && ascii(4, 'ftyp') && (ascii(8, 'avif') || ascii(8, 'avis'))) return true;           // AVIF
  return false;
}

/** ¿Empieza como un PDF (%PDF-)? */
export function esPdfPorFirma(b: Uint8Array): boolean {
  return b.length >= 5 && [...'%PDF-'].every((c, i) => b[i] === c.charCodeAt(0));
}

async function leerCabecera(file: Blob, bytes = 32): Promise<Uint8Array> {
  const trozo = file.slice(0, bytes);
  if (typeof trozo.arrayBuffer === 'function') return new Uint8Array(await trozo.arrayBuffer());
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(new Uint8Array(lector.result as ArrayBuffer));
    lector.onerror = () => reject(lector.error);
    lector.readAsArrayBuffer(trozo);
  });
}

/**
 * Validación completa: lo de validarArchivo y, además, que los primeros bytes (magic bytes) correspondan a una imagen
 * o PDF de verdad, así un archivo con extensión o tipo cambiado no pasa. Devuelve el mensaje de error o null.
 */
export async function validarContenidoArchivo(file: File, permitidos: TipoArchivo[]): Promise<string | null> {
  const problema = validarArchivo(file, permitidos);
  if (problema) return problema;
  const tipo = tipoDeArchivo(file);
  if (tipo === 'imagen' || tipo === 'pdf') {
    let cabecera: Uint8Array;
    try {
      cabecera = await leerCabecera(file);
    } catch {
      return 'No se pudo leer el archivo. Elígelo de nuevo.';
    }
    if (tipo === 'imagen' && !esImagenPorFirma(cabecera)) {
      return `El contenido del archivo no corresponde a una imagen ${NOMBRES_IMAGEN}.`;
    }
    if (tipo === 'pdf' && !esPdfPorFirma(cabecera)) {
      return 'El contenido del archivo no corresponde a un PDF.';
    }
  }
  return null;
}
