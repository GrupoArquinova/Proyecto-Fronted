export type TipoMultimedia = 'IMAGEN' | 'VIDEO' | 'PDF' | 'PLANO' | 'PANORAMICA_360' | 'BENEFICIOS' | 'RESPALDO' | 'MAPA' | 'ZONAS_DESTACADAS' | 'FONDO_AMENIDADES' | 'OTRO';

export interface Multimedia {
  id?: number;
  proyectoId?: number | null;
  proyectoNombre?: string;
  loteId?: number | null;
  loteCodigo?: string;
  zonaComunId?: number | null;
  zonaComunNombre?: string;
  casaModeloId?: number | null;
  casaModeloNombre?: string;
  etapaId?: number | null;
  etapaNombre?: string;
  tipo: TipoMultimedia;
  titulo?: string;
  descripcion?: string;
  url: string;
  /** La misma imagen con su texto en inglés (opcional): el sitio la usa cuando está en inglés. */
  urlEn?: string | null;
  nombreArchivo?: string;
  mimeType?: string;
  tamanoBytes?: number;
  orden?: number;
  portada: boolean;
  publicado: boolean;
  activo: boolean;
}