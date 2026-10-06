/** Imagen sobre la que se coloca el punto: entorno 360°, vista aérea 360° o plano de urbanismo. */
export type EscenaPunto = 'ENTORNO' | 'AEREA' | 'URBANISMO';

export const ESCENAS_PUNTO: { id: EscenaPunto; titulo: string }[] = [
  { id: 'ENTORNO', titulo: 'Entorno 360°' },
  { id: 'AEREA', titulo: 'Vista aérea 360°' },
  { id: 'URBANISMO', titulo: 'Plano de urbanismo' }
];

/** Botón sobre la imagen. ENTORNO y AEREA se ubican por ángulos (radianes); URBANISMO, por porcentaje. */
export interface Punto360 {
  id?: number;
  proyectoId: number;
  escena: EscenaPunto;
  etiqueta: string;

  loteId?: number | null;
  loteCodigo?: string | null;
  loteAreaM2?: number | null;
  loteEstado?: string | null;

  etapaId?: number | null;
  etapaNombre?: string | null;

  yaw?: number | null;
  pitch?: number | null;
  posX?: number | null;
  posY?: number | null;
}

/** Lo que se envía al guardar: el servidor completa los datos del lote o la etapa. */
export type Punto360Request = Pick<Punto360, 'proyectoId' | 'escena' | 'etiqueta' | 'loteId' | 'etapaId' | 'yaw' | 'pitch' | 'posX' | 'posY'>;
