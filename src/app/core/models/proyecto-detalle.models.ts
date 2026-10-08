import { Proyecto } from './proyecto.models';
import { Ubicacion } from './ubicacion.models';
import { ZonaComun } from './zona-comun.models';
import { CasaModelo } from './casa-modelo.models';
import { Lote } from './lote.models';
import { Multimedia } from './multimedia.models';
import { ContenidoInstitucional } from './contenido.models';
import { Punto360 } from './punto-360.models';

/** Todo lo que el sitio público necesita para mostrar un proyecto. Las listas vacías ocultan su sección. */
export interface ProyectoDetalle {
  proyecto: Proyecto;
  ubicacion: Ubicacion | null;
  zonasComunes: ZonaComun[];
  casasModelo: CasaModelo[];
  lotes: Lote[];
  multimedia: Multimedia[];
  /** Imágenes (renders) y planos de cada tipología. */
  multimediaCasas: Multimedia[];
  /** Imágenes subidas desde Multimedia a cada amenidad (la portada es la imagen principal de la zona). */
  multimediaZonas: Multimedia[];
  contenido: ContenidoInstitucional[];
  /** Botones sobre el entorno 360°, la vista aérea y el plano de urbanismo. */
  puntos: Punto360[];
}

/** Una imagen de la galería de las zonas comunes, con la zona a la que pertenece. */
export interface ImagenZona {
  url: string;
  titulo: string;
  zonaId: number;
  zonaNombre: string;
}

/** Secciones que, sin vista elegida en el menú, muestran su portada (a pantalla completa) y no la primera vista. */
export const SECCIONES_CON_PORTADA: string[] = ['bienvenida', 'zonas-comunes'];

/** Clave del texto institucional que alimenta la vista "Beneficios" de Bienvenida (no se repite en Respaldo). */
export const SECCION_BENEFICIOS = 'BENEFICIOS';

export type EstadoCargaProyecto = 'cargando' | 'listo' | 'no-encontrado' | 'error';

export type SeccionProyectoId =
  | 'bienvenida'
  | 'respaldo'
  | 'ubicacion'
  | 'zonas-comunes'
  | 'lotes'
  | 'casa-modelo'
  | 'disponibilidad'
  | 'videos'
  | 'contacto';

/** Vista dentro de una sección (se selecciona con el query param `vista`). */
export interface SubseccionProyecto {
  id: string;
  titulo: string;
}

export interface SeccionProyecto {
  id: SeccionProyectoId;
  titulo: string;
  subsecciones: SubseccionProyecto[];
}
