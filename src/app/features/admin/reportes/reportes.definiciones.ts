import {
  ActividadReporteItem, EstadoComercialItem, EtapaReporteItem, LoteReporteItem, ProyectoReporteItem, ReporteId,
  SolicitudReporteItem
} from '../../../core/models/reporte.models';

export type Pestana = ReporteId;
export type FiltroUsado = 'proyecto' | 'estadoLote' | 'estadoSolicitud' | 'estadoProyecto' | 'fechas' | 'inactivos';

export interface ColumnaVista {
  titulo: string;
  valor: (fila: unknown) => string | number;
  /** num: cifra a la derecha; barra: porcentaje dibujado como barra; largo: texto que se recorta. */
  tipo?: 'num' | 'barra' | 'largo';
}

export interface DefinicionReporte {
  id: Pestana;
  titulo: string;
  /** Parte del nombre del archivo que se descarga. */
  archivo: string;
  descripcion: string;
  filtros: FiltroUsado[];
  columnas: ColumnaVista[];
}

/** "EN_GESTION" → "En gestión": los nombres de la base se muestran como palabras. */
export function legible(valor: string | null | undefined): string {
  if (!valor) return '';
  const conocidas: Record<string, string> = {
    EN_DISENO: 'En diseño', EN_TRAMITE: 'En trámite', EN_CONSTRUCCION: 'En construcción', FINALIZADO: 'Finalizado',
    EN_GESTION: 'En gestión', OFERTA_COMERCIAL: 'Oferta comercial', PORTAFOLIO: 'Portafolio'
  };
  const conocida = conocidas[valor.trim().toUpperCase()];
  if (conocida) return conocida;
  const limpio = valor.trim().replace(/_/g, ' ').toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/** dd/MM/yyyy (y la hora si la trae), sin pasar por zonas horarias: la fecha es la que guardó el servidor. */
export function fecha(iso: string | null | undefined, conHora = false): string {
  const m = iso ? ISO.exec(iso) : null;
  if (!m) return '';
  const dia = `${m[3]}/${m[2]}/${m[1]}`;
  return conHora && m[4] ? `${dia} ${m[4]}:${m[5]}` : dia;
}

export function decimal(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const siNo = (valor: boolean | null | undefined) => (valor ? 'Sí' : 'No');

function col<T>(titulo: string, valor: (fila: T) => string | number, tipo?: ColumnaVista['tipo']): ColumnaVista {
  return { titulo, valor: (fila) => valor(fila as T), tipo };
}

const porcentajeVendido = (e: EtapaReporteItem) => (e.totalLotes ? (e.vendidos * 100) / e.totalLotes : 0);

export const PESTANAS: DefinicionReporte[] = [
  {
    id: 'lotes', titulo: 'Lotes', archivo: 'Lotes', descripcion: 'Inventario de lotes con su estado comercial.',
    filtros: ['proyecto', 'estadoLote', 'fechas', 'inactivos'],
    columnas: [
      col<LoteReporteItem>('Proyecto', (l) => l.proyectoNombre),
      col<LoteReporteItem>('Etapa', (l) => l.etapaNombre),
      col<LoteReporteItem>('Código', (l) => l.codigo),
      col<LoteReporteItem>('Nombre', (l) => l.loteNombre ?? ''),
      col<LoteReporteItem>('Área (m²)', (l) => decimal(l.areaM2), 'num'),
      col<LoteReporteItem>('Estado', (l) => legible(l.estadoComercial)),
      col<LoteReporteItem>('Publicado', (l) => siNo(l.publicado)),
      col<LoteReporteItem>('Activo', (l) => siNo(l.activo)),
      col<LoteReporteItem>('Creado', (l) => fecha(l.creadoEn)),
    ],
  },
  {
    id: 'proyectos', titulo: 'Proyectos', archivo: 'Proyectos', descripcion: 'Proyectos con su etapa, publicación y total de lotes.',
    filtros: ['proyecto', 'estadoProyecto', 'fechas', 'inactivos'],
    columnas: [
      col<ProyectoReporteItem>('Proyecto', (p) => p.nombre),
      col<ProyectoReporteItem>('Empresa', (p) => p.empresaNombre),
      col<ProyectoReporteItem>('Etapa', (p) => legible(p.estadoProyecto)),
      col<ProyectoReporteItem>('Publicado', (p) => siNo(p.publicado)),
      col<ProyectoReporteItem>('Activo', (p) => siNo(p.activo)),
      col<ProyectoReporteItem>('Lanzamiento', (p) => fecha(p.fechaLanzamiento)),
      col<ProyectoReporteItem>('Lotes', (p) => p.totalLotes ?? 0, 'num'),
      col<ProyectoReporteItem>('Creado', (p) => fecha(p.creadoEn)),
    ],
  },
  {
    id: 'etapas', titulo: 'Etapas', archivo: 'Etapas', descripcion: 'Lotes de cada etapa por estado comercial.',
    filtros: ['proyecto', 'inactivos'],
    columnas: [
      col<EtapaReporteItem>('Proyecto', (e) => e.proyectoNombre),
      col<EtapaReporteItem>('Etapa', (e) => e.etapaNombre),
      col<EtapaReporteItem>('Total', (e) => e.totalLotes, 'num'),
      col<EtapaReporteItem>('Disponibles', (e) => e.disponibles, 'num'),
      col<EtapaReporteItem>('Reservados', (e) => e.reservados, 'num'),
      col<EtapaReporteItem>('Vendidos', (e) => e.vendidos, 'num'),
      col<EtapaReporteItem>('Área (m²)', (e) => decimal(e.areaTotalM2), 'num'),
      col<EtapaReporteItem>('% vendido', (e) => porcentajeVendido(e), 'barra'),
    ],
  },
  {
    id: 'estados-comerciales', titulo: 'Estados comerciales', archivo: 'Estados_Comerciales',
    descripcion: 'Cuántos lotes de cada proyecto están disponibles, reservados o vendidos.',
    filtros: ['proyecto', 'inactivos'],
    columnas: [
      col<EstadoComercialItem>('Proyecto', (e) => e.proyectoNombre),
      col<EstadoComercialItem>('Estado', (e) => legible(e.estadoNombre)),
      col<EstadoComercialItem>('Lotes', (e) => e.cantidadLotes, 'num'),
      col<EstadoComercialItem>('Porcentaje del proyecto', (e) => Number(e.porcentaje ?? 0), 'barra'),
    ],
  },
  {
    id: 'solicitudes', titulo: 'Solicitudes', archivo: 'Solicitudes', descripcion: 'Solicitudes de contacto recibidas por el sitio.',
    filtros: ['proyecto', 'estadoSolicitud', 'fechas'],
    columnas: [
      col<SolicitudReporteItem>('Fecha', (s) => fecha(s.creadoEn, true)),
      col<SolicitudReporteItem>('Cliente', (s) => s.clienteNombre),
      col<SolicitudReporteItem>('Correo', (s) => s.clienteCorreo),
      col<SolicitudReporteItem>('Teléfono', (s) => s.clienteTelefono),
      col<SolicitudReporteItem>('Proyecto', (s) => s.proyectoNombre),
      col<SolicitudReporteItem>('Tipología', (s) => s.tipologiaNombre ?? ''),
      col<SolicitudReporteItem>('Mensaje', (s) => s.mensaje ?? '', 'largo'),
      col<SolicitudReporteItem>('Estado', (s) => legible(s.estadoNombre)),
      col<SolicitudReporteItem>('Atendida por', (s) => s.atendidaPorNombre),
    ],
  },
  {
    id: 'actividad', titulo: 'Actividad', archivo: 'Actividad', descripcion: 'Historial de acciones de los administradores.',
    filtros: ['fechas'],
    columnas: [
      col<ActividadReporteItem>('Fecha', (a) => fecha(a.creadoEn, true)),
      col<ActividadReporteItem>('Usuario', (a) => a.usuarioNombre),
      col<ActividadReporteItem>('Acción', (a) => a.accion),
      col<ActividadReporteItem>('Entidad', (a) => a.entidad),
      col<ActividadReporteItem>('Descripción', (a) => a.descripcion ?? '', 'largo'),
      col<ActividadReporteItem>('IP', (a) => a.ip ?? ''),
    ],
  },
];

export function definicionDe(id: Pestana): DefinicionReporte {
  return PESTANAS.find((p) => p.id === id) ?? PESTANAS[0];
}
