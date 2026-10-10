export type TipoMultimedia = 'IMAGEN' | 'VIDEO' | 'PDF' | 'PLANO' | 'PANORAMICA_360' | 'BENEFICIOS' | 'RESPALDO' | 'MAPA' | 'ZONAS_DESTACADAS' | 'OTRO';

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
  nombreArchivo?: string;
  mimeType?: string;
  tamanoBytes?: number;
  orden?: number;
  portada: boolean;
  publicado: boolean;
  activo: boolean;
  vinculoTexto?: string; // ← calculado una sola vez al cargar, no en el template
}