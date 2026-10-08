import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ProyectoService } from './proyecto.service';
import { UbicacionService } from './ubicacion.service';
import { ZonaComunService } from './zona-comun.service';
import { CasaModeloService } from './casa-modelo.service';
import { LoteService } from './lote.service';
import { MultimediaService } from './multimedia.service';
import { ContenidoService } from './contenido.service';
import { Punto360Service } from './punto-360.service';
import { EscenaPunto } from '../models/punto-360.models';
import { ZonaComun } from '../models/zona-comun.models';
import { Multimedia } from '../models/multimedia.models';
import { clasificarMedio, coordenadasDeGoogleMaps, urlGoogleMapsSatelite } from '../utils/medios';
import { formatoArea, ordenarLotes } from '../utils/lotes';
import {
  EstadoCargaProyecto,
  ImagenZona,
  SECCION_BENEFICIOS,
  ProyectoDetalle,
  SeccionProyecto,
  SubseccionProyecto
} from '../models/proyecto-detalle.models';

/** Una consulta secundaria que falla no debe tumbar todo el micrositio: esa sección simplemente no aparece. */
const opcional = <T, R>(valor: R) => catchError<T, Observable<R>>(() => of(valor));

/**
 * Estado del micrositio de UN proyecto. Se provee en el layout (no es global), así cada visita
 * arranca limpia. Carga todo en paralelo y calcula qué secciones del menú tienen contenido.
 */
@Injectable()
export class ProyectoDetalleService {
  private proyectoService = inject(ProyectoService);
  private ubicacionService = inject(UbicacionService);
  private zonaService = inject(ZonaComunService);
  private casaService = inject(CasaModeloService);
  private loteService = inject(LoteService);
  private multimediaService = inject(MultimediaService);
  private contenidoService = inject(ContenidoService);
  private puntoService = inject(Punto360Service);

  private carga?: Subscription;

  readonly estado = signal<EstadoCargaProyecto>('cargando');
  readonly detalle = signal<ProyectoDetalle | null>(null);

  /** Menú lateral: solo las secciones (y vistas) que el administrador ya llenó. */
  readonly secciones = computed<SeccionProyecto[]>(() => {
    const d = this.detalle();
    return d ? this.construirSecciones(d) : [];
  });

  /**
   * Imagen de fondo para ubicar los lotes: un PLANO del proyecto, o en su defecto el plano de
   * urbanismo o la vista aérea cuando son imágenes. null si el administrador no cargó ninguna.
   */
  readonly imagenPlano = computed<string | null>(() => {
    const d = this.detalle();
    if (!d) return null;
    const candidatas = [
      d.multimedia.find(m => m.tipo === 'PLANO')?.url,
      d.ubicacion?.urbanismoUrl,
      d.ubicacion?.vistaAereaUrl
    ];
    return candidatas.find(url => !!url && clasificarMedio(url).tipo === 'imagen') ?? null;
  });

  /** Lámina de beneficios (una imagen hecha en Canva): multimedia de tipo BENEFICIOS. */
  readonly imagenBeneficios = computed<string | null>(() =>
    this.detalle()?.multimedia.find(m => m.tipo === 'BENEFICIOS')?.url ?? null);

  /** Todas las láminas de beneficios del proyecto, en el orden del administrador (con varias se muestran en un carrusel). */
  readonly laminasBeneficios = computed(() =>
    (this.detalle()?.multimedia ?? [])
      .filter(m => m.tipo === 'BENEFICIOS')
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0))
      .map(m => ({ id: m.id, url: m.url, titulo: m.titulo })));

  /** Fotos del carrusel de Bienvenida: las imágenes del proyecto, en el orden definido por el administrador. */
  readonly galeria = computed(() =>
    (this.detalle()?.multimedia ?? [])
      .filter(m => m.tipo === 'IMAGEN')
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

  /** Láminas de respaldo del proyecto (documentos y avales hechos en Canva): multimedia de tipo RESPALDO. */
  readonly respaldo = computed(() =>
    (this.detalle()?.multimedia ?? [])
      .filter(m => m.tipo === 'RESPALDO')
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

  /** Imágenes del mapa de ubicación (hechas en Canva): multimedia de tipo MAPA, en el orden del administrador. */
  readonly mapas = computed(() =>
    (this.detalle()?.multimedia ?? [])
      .filter(m => m.tipo === 'MAPA')
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

  /**
   * Mapa de Google para la vista "Google Maps": una URL embed ya lista o, si no, un mapa satelital armado con las
   * coordenadas del enlace (o las de la ubicación). Con un enlace corto que no se puede leer y sin coordenadas es null
   * y queda el botón que abre Google Maps.
   */
  readonly urlGoogleMaps = computed<string | null>(() => {
    const d = this.detalle();
    const u = d?.ubicacion;
    if (!d || !u) return null;

    const embed = clasificarMedio(u.googleMapsUrl);
    if (embed.tipo === 'incrustado' && embed.embedUrl?.startsWith('https://www.google.com/maps/embed')) return embed.embedUrl;

    const coordenadas = coordenadasDeGoogleMaps(u.googleMapsUrl)
      ?? (u.latitud != null && u.longitud != null ? { latitud: Number(u.latitud), longitud: Number(u.longitud) } : null);
    return coordenadas && Number.isFinite(coordenadas.latitud) && Number.isFinite(coordenadas.longitud)
      ? urlGoogleMapsSatelite(coordenadas.latitud, coordenadas.longitud, d.proyecto.nombre)
      : null;
  });

  /** Imagen de fondo de Zonas destacadas (vista aérea o plano con los botones de cada zona): multimedia ZONAS_DESTACADAS. */
  readonly imagenZonasDestacadas = computed<string | null>(() =>
    (this.detalle()?.multimedia ?? [])
      .filter(m => m.tipo === 'ZONAS_DESTACADAS')
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0))[0]?.url ?? null);

  /**
   * Todas las imágenes de las zonas comunes (galería), en el orden de las zonas. De cada zona van primero las imágenes
   * subidas desde Multimedia (la portada primero) y después las de su galería, sin repetir.
   */
  readonly imagenesZonas = computed<ImagenZona[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    return d.zonasComunes.flatMap(z => {
      const deMultimedia = (d.multimediaZonas ?? [])
        .filter(m => m.zonaComunId === z.id && m.tipo === 'IMAGEN')
        .sort((a, b) => Number(b.portada) - Number(a.portada) || (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0))
        .map(m => ({ url: m.url, titulo: m.titulo || z.nombre }));
      const deGaleria = (z.imagenes ?? []).map(i => ({ url: i.imagenUrl, titulo: i.titulo || z.nombre }));
      const vistas = new Set<string>();
      return [...deMultimedia, ...deGaleria]
        .filter(i => !vistas.has(i.url) && !!vistas.add(i.url))
        .map(i => ({ ...i, zonaId: z.id as number, zonaNombre: z.nombre }));
    });
  });

  /** Foto con la que se presenta una zona: su primera imagen (la portada de Multimedia, si la hay), la principal de la galería o, en último caso, la del proyecto. */
  fotoDeZona(zona: ZonaComun | null | undefined): string | null {
    const subida = (this.detalle()?.multimediaZonas ?? [])
      .filter(m => m.zonaComunId === zona?.id && m.tipo === 'IMAGEN')
      .sort((x, y) => Number(y.portada) - Number(x.portada) || (x.orden ?? 0) - (y.orden ?? 0) || (x.id ?? 0) - (y.id ?? 0))[0]?.url;
    return subida ?? zona?.imagenPrincipalUrl ?? zona?.imagenes?.[0]?.imagenUrl ?? this.detalle()?.proyecto.imagenUrl ?? null;
  }

  /** Botones de una imagen (entorno, vista aérea o plano de urbanismo). */
  puntosDe(escena: EscenaPunto) {
    return (this.detalle()?.puntos ?? []).filter(p => p.escena === escena);
  }

  /**
   * ¿Esta vista se muestra a pantalla completa (con el menú flotando encima)? Pasa con el entorno 360° y la vista
   * aérea cuando son imagen, video o un tour incrustable, y con el plano de urbanismo cuando es una imagen.
   * Si el administrador cargó un enlace que no se puede incrustar, queda la página normal con su botón.
   */
  esInmersiva(seccionId: string, vistaId: string | null): boolean {
    if (seccionId === 'zonas-comunes') return this.zonasInmersiva(vistaId);

    const u = this.detalle()?.ubicacion;
    if (seccionId !== 'ubicacion' || !u) return false;

    const tipo = (url?: string | null) => clasificarMedio(url).tipo;
    switch (vistaId) {
      case 'entorno-360': return ['imagen', 'video', 'incrustado'].includes(tipo(u.recorrido360Url));
      case 'vista-aerea': return ['imagen', 'video', 'incrustado'].includes(tipo(u.vistaAereaUrl));
      case 'urbanismo': return tipo(u.urbanismoUrl) === 'imagen';
      // Con imágenes de mapa subidas se ve como carrusel a pantalla completa; sin ellas queda el mapa interactivo
      case 'mapa': return this.mapas().length > 0;
      // Google Maps se incrusta a pantalla completa cuando hay con qué armar el mapa
      case 'google-maps': return this.urlGoogleMaps() != null;
      default: return false;
    }
  }

  /** Zonas comunes: la portada (sin vista), las zonas destacadas (imagen con botones) y la galería van a pantalla completa. */
  private zonasInmersiva(vistaId: string | null): boolean {
    const zonas = this.detalle()?.zonasComunes ?? [];
    switch (vistaId) {
      case 'destacadas': return this.imagenZonasDestacadas() != null;
      case 'galeria': return this.imagenesZonas().length > 0;
      default: return zonas.length > 0;
    }
  }

  cargar(proyectoId: number): void {
    this.carga?.unsubscribe();
    this.estado.set('cargando');
    this.detalle.set(null);

    this.carga = this.proyectoService.getProyectoPorId(proyectoId).pipe(
      switchMap(proyecto => forkJoin({
        ubicacion: this.ubicacionService.obtenerPorProyecto(proyectoId).pipe(opcional(null)),
        zonasComunes: this.zonaService.listarPublicasPorProyecto(proyectoId).pipe(opcional([])),
        casasModelo: this.casaService.listarPublicasPorProyecto(proyectoId).pipe(opcional([])),
        lotes: this.loteService.obtenerLotesPublicos().pipe(
          map(lotes => ordenarLotes(lotes.filter(l => l.proyectoId === proyectoId))),
          opcional([])
        ),
        multimedia: this.multimediaService.listarPublicadosPorEntidad('proyecto', proyectoId).pipe(opcional([])),
        contenido: this.contenidoService.obtenerPublicadosPorEmpresa(proyecto.empresaId).pipe(opcional([])),
        puntos: this.puntoService.listarPorProyecto(proyectoId).pipe(opcional([]))
      }).pipe(
        // Imágenes y planos de cada tipología (se piden aparte porque dependen de las tipologías publicadas)
        switchMap(datos => {
          const pedidos = datos.casasModelo
            .filter(casa => casa.id != null)
            .map(casa => this.multimediaService.listarPublicadosPorEntidad('casaModelo', casa.id as number).pipe(opcional([])));
          const pedidosZonas = datos.zonasComunes
            .filter(zona => zona.id != null)
            .map(zona => this.multimediaService.listarPublicadosPorEntidad('zonaComun', zona.id as number).pipe(opcional([])));
          return forkJoin({
            casas: pedidos.length > 0 ? forkJoin(pedidos) : of([] as Multimedia[][]),
            zonas: pedidosZonas.length > 0 ? forkJoin(pedidosZonas) : of([] as Multimedia[][])
          }).pipe(
            map(listas => ({ proyecto, ...datos, multimediaCasas: listas.casas.flat(), multimediaZonas: listas.zonas.flat() }))
          );
        })
      ))
    ).subscribe({
      next: detalle => {
        this.detalle.set(detalle);
        this.estado.set('listo');
      },
      error: (err: HttpErrorResponse) => this.estado.set(err.status === 404 ? 'no-encontrado' : 'error')
    });
  }

  private construirSecciones(d: ProyectoDetalle): SeccionProyecto[] {
    const secciones: SeccionProyecto[] = [];
    const u = d.ubicacion;
    const videos = d.multimedia.filter(m => m.tipo === 'VIDEO');
    const esBeneficios = (c: { seccion: string }) => c.seccion.toUpperCase() === SECCION_BENEFICIOS;
    const hayRespaldo = d.multimedia.some(m => m.tipo === 'RESPALDO');

    // Bienvenida: sin vista elegida muestra la portada. El carrusel (vista con el nombre del proyecto) sale de las
    // imágenes del proyecto; Beneficios, de la lámina BENEFICIOS o, si no hay, del contenido institucional.
    secciones.push({
      id: 'bienvenida',
      titulo: 'Bienvenida',
      subsecciones: this.vistas([
        ['galeria', d.proyecto.nombre, d.multimedia.some(m => m.tipo === 'IMAGEN')],
        ['beneficios', 'Beneficios', d.multimedia.some(m => m.tipo === 'BENEFICIOS') || d.contenido.some(esBeneficios)],
        ['video', 'Video', videos.length > 0]
      ])
    });

    // Respaldo es propio de cada proyecto (láminas); el de la empresa vive en el inicio del sitio
    if (hayRespaldo) {
      secciones.push({ id: 'respaldo', titulo: 'Respaldo', subsecciones: [] });
    }

    if (u) {
      secciones.push({
        id: 'ubicacion',
        titulo: 'Ubicación',
        subsecciones: this.vistas([
          ['entorno-360', 'Entorno 360', !!u.recorrido360Url],
          ['vista-aerea', 'Vista Aérea', !!u.vistaAereaUrl],
          ['urbanismo', 'Urbanismo', !!u.urbanismoUrl],
          ['mapa', 'Mapa', d.multimedia.some(m => m.tipo === 'MAPA') || (u.latitud != null && u.longitud != null)],
          ['google-maps', 'Google Maps', !!u.googleMapsUrl]
        ])
      });
    }

    if (d.zonasComunes.length > 0) {
      secciones.push({
        id: 'zonas-comunes',
        titulo: 'Amenidades',
        subsecciones: this.vistas([
          ['destacadas', 'Zonas Destacadas', d.multimedia.some(m => m.tipo === 'ZONAS_DESTACADAS')],
          ['galeria', 'Galería', d.zonasComunes.some(z => (z.imagenes?.length ?? 0) > 0)]
        ])
      });
    }

    // Una vista por lote ("L1 — 800 m²"): el menú funciona como índice de lotes
    if (d.lotes.length > 0) {
      secciones.push({
        id: 'lotes',
        titulo: 'Lotes',
        subsecciones: d.lotes.map(l => ({ id: String(l.id), titulo: `${l.codigo} — ${formatoArea(l.areaM2)}` }))
      });
    }

    if (d.casasModelo.length > 0) {
      secciones.push({
        id: 'casa-modelo',
        titulo: 'Tipologías',
        subsecciones: this.vistas([
          ['imagenes', 'Imágenes', d.multimediaCasas.some(m => m.tipo === 'IMAGEN')],
          ['planos', 'Planos', d.casasModelo.some(c => !!c.planoUrl) || d.multimediaCasas.some(m => m.tipo === 'PLANO')],
          ['tour-virtual', 'Tour Virtual', d.casasModelo.some(c => !!c.tourVirtualUrl)]
        ])
      });
    }

    if (d.lotes.length > 0) {
      secciones.push({
        id: 'disponibilidad',
        titulo: 'Disponibilidad',
        subsecciones: this.etapasDeLotes(d)
      });
    }

    const vistasVideo = this.vistas([
      ['proyecto', 'Proyecto', videos.length > 0],
      ['como-llegar', '¿Cómo llegar?', !!u?.videoComoLlegarUrl]
    ]);
    if (vistasVideo.length > 0) {
      secciones.push({ id: 'videos', titulo: 'Videos', subsecciones: vistasVideo });
    }

    secciones.push({ id: 'contacto', titulo: 'Contacto', subsecciones: [] });
    return secciones;
  }

  private vistas(definicion: [string, string, boolean][]): SubseccionProyecto[] {
    return definicion.filter(([, , visible]) => visible).map(([id, titulo]) => ({ id, titulo }));
  }

  /** Una vista por etapa que tenga lotes, ordenadas por nombre. */
  private etapasDeLotes(d: ProyectoDetalle): SubseccionProyecto[] {
    const etapas = new Map<number, string>();
    for (const lote of d.lotes) {
      if (lote.etapaId != null && !etapas.has(lote.etapaId)) {
        etapas.set(lote.etapaId, lote.etapaNombre ?? `Etapa ${lote.etapaId}`);
      }
    }
    return [...etapas.entries()]
      .map(([id, titulo]) => ({ id: String(id), titulo }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { numeric: true }));
  }
}
