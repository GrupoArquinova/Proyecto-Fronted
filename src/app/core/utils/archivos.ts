export type TipoArchivo = 'imagen' | 'video' | 'pdf';

const MB = 1024 * 1024;

/**
 * Límites de subida. El backend no valida tipo ni tamaño (la subida va directo a Cloudinary),
 * así que se controlan aquí para no llenar la cuota por un archivo equivocado.
 */
const REGLAS: Record<TipoArchivo, { mime: RegExp; accept: string; maxMb: number; plural: string }> = {
  imagen: { mime: /^image\//, accept: 'image/*', maxMb: 10, plural: 'imágenes' },
  video: { mime: /^video\//, accept: 'video/*', maxMb: 100, plural: 'videos' },
  pdf: { mime: /^application\/pdf$/, accept: 'application/pdf', maxMb: 20, plural: 'PDF' }
};

/** Valor para el atributo `accept` del input, por ejemplo "image/*,application/pdf". */
export function atributoAccept(tipos: TipoArchivo[]): string {
  return tipos.map(t => REGLAS[t].accept).join(',');
}

/** Tipo de archivo de Cloudinary/Multimedia al que corresponde el File, o null si no es compatible. */
export function tipoDeArchivo(file: Pick<File, 'type'>): TipoArchivo | null {
  return (Object.keys(REGLAS) as TipoArchivo[]).find(t => REGLAS[t].mime.test(file.type)) ?? null;
}

/** Devuelve el mensaje de error para mostrar al usuario, o null si el archivo es válido. */
export function validarArchivo(file: Pick<File, 'type' | 'size'>, permitidos: TipoArchivo[]): string | null {
  const tipo = tipoDeArchivo(file);
  if (!tipo || !permitidos.includes(tipo)) {
    const nombres = permitidos.map(t => REGLAS[t].plural).join(' o ');
    return `Este archivo no es válido. Sube ${nombres}.`;
  }
  const limite = REGLAS[tipo].maxMb;
  if (file.size > limite * MB) {
    const pesa = Math.ceil(file.size / MB);
    return `El archivo pesa ${pesa} MB y el máximo para ${REGLAS[tipo].plural} es ${limite} MB.`;
  }
  return null;
}
