import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProyectoDetalleService } from './proyecto-detalle.service';
import { ProyectoService } from './proyecto.service';
import { UbicacionService } from './ubicacion.service';
import { ZonaComunService } from './zona-comun.service';
import { CasaModeloService } from './casa-modelo.service';
import { LoteService } from './lote.service';
import { MultimediaService } from './multimedia.service';
import { ContenidoService } from './contenido.service';
import { Punto360Service } from './punto-360.service';
import { IdiomaService } from './idioma.service';
import { ProyectoDetalle } from '../models/proyecto-detalle.models';
import { provideI18nPruebas } from '../../i18n/pruebas';

const vacio = (): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: null,
  zonasComunes: [],
  casasModelo: [],
  lotes: [],
  multimedia: [],
  multimediaCasas: [],
  multimediaZonas: [],
  contenido: [],
  puntos: []
});

const mm = (extra: object) => ({ tipo: 'IMAGEN', url: 'https://x.com/a.png', portada: false, publicado: true, activo: true, ...extra }) as never;

describe('ProyectoDetalleService (casos adicionales)', () => {
  let servicio: ProyectoDetalleService;
  let proyectos: { getProyectoPorId: ReturnType<typeof vi.fn> };
  let ubicaciones: { obtenerPorProyecto: ReturnType<typeof vi.fn> };
  let zonas: { listarPublicasPorProyecto: ReturnType<typeof vi.fn> };
  let casas: { listarPublicasPorProyecto: ReturnType<typeof vi.fn> };
  let lotes: { obtenerLotesPublicos: ReturnType<typeof vi.fn> };
  let multimedia: { listarPublicadosPorEntidad: ReturnType<typeof vi.fn> };
  let contenidos: { obtenerPublicadosPorEmpresa: ReturnType<typeof vi.fn> };
  let puntos: { listarPorProyecto: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    proyectos = { getProyectoPorId: vi.fn(() => of({ id: 7, empresaId: 3, nombre: 'La Hacienda' })) };
    ubicaciones = { obtenerPorProyecto: vi.fn(() => of(null)) };
    zonas = { listarPublicasPorProyecto: vi.fn(() => of([])) };
    casas = { listarPublicasPorProyecto: vi.fn(() => of([])) };
    lotes = { obtenerLotesPublicos: vi.fn(() => of([])) };
    multimedia = { listarPublicadosPorEntidad: vi.fn(() => of([])) };
    contenidos = { obtenerPublicadosPorEmpresa: vi.fn(() => of([])) };
    puntos = { listarPorProyecto: vi.fn(() => of([])) };
    TestBed.configureTestingModule({
      providers: [
        provideI18nPruebas(),
        ProyectoDetalleService,
        { provide: ProyectoService, useValue: proyectos },
        { provide: UbicacionService, useValue: ubicaciones },
        { provide: ZonaComunService, useValue: zonas },
        { provide: CasaModeloService, useValue: casas },
        { provide: LoteService, useValue: lotes },
        { provide: MultimediaService, useValue: multimedia },
        { provide: ContenidoService, useValue: contenidos },
        { provide: Punto360Service, useValue: puntos }
      ]
    });
    servicio = TestBed.inject(ProyectoDetalleService);
  });

  const vistas = (id: string) => servicio.secciones().find(s => s.id === id)?.subsecciones.map(v => v.id);

  describe('cargar', () => {
    it('sin datos secundarios queda listo con listas vacías y sin pedir multimedia de casas ni zonas', () => {
      servicio.cargar(7);
      expect(servicio.estado()).toBe('listo');
      expect(servicio.detalle()!.multimediaCasas).toEqual([]);
      expect(servicio.detalle()!.multimediaZonas).toEqual([]);
      // Solo se pide la multimedia del proyecto
      expect(multimedia.listarPublicadosPorEntidad).toHaveBeenCalledTimes(1);
      expect(multimedia.listarPublicadosPorEntidad).toHaveBeenCalledWith('proyecto', 7);
    });

    it('consulta el contenido institucional con la empresa del proyecto', () => {
      servicio.cargar(7);
      expect(contenidos.obtenerPublicadosPorEmpresa).toHaveBeenCalledWith(3);
    });

    it('pide imágenes de cada casa y de cada zona con id y las junta aplanadas', () => {
      casas.listarPublicasPorProyecto.mockReturnValue(of([{ id: 1, nombre: 'A' }, { nombre: 'sin id' }, { id: 2, nombre: 'B' }]));
      zonas.listarPublicasPorProyecto.mockReturnValue(of([{ id: 5, nombre: 'Piscina' }, { nombre: 'sin id' }]));
      multimedia.listarPublicadosPorEntidad.mockImplementation((tipo: string, id: number) =>
        of(tipo === 'proyecto' ? [] : [mm({ id: id * 10, titulo: `${tipo}-${id}` })]));

      servicio.cargar(7);

      const d = servicio.detalle()!;
      expect(d.multimediaCasas.map(m => m.titulo)).toEqual(['casaModelo-1', 'casaModelo-2']);
      expect(d.multimediaZonas.map(m => m.titulo)).toEqual(['zonaComun-5']);
      expect(multimedia.listarPublicadosPorEntidad).not.toHaveBeenCalledWith('casaModelo', undefined);
      expect(servicio.estado()).toBe('listo');
    });

    it('si falla la multimedia de una casa o zona, esa lista queda vacía pero el proyecto carga', () => {
      casas.listarPublicasPorProyecto.mockReturnValue(of([{ id: 1, nombre: 'A' }]));
      zonas.listarPublicasPorProyecto.mockReturnValue(of([{ id: 5, nombre: 'Piscina' }]));
      multimedia.listarPublicadosPorEntidad.mockImplementation((tipo: string) =>
        tipo === 'proyecto' || tipo === 'zonaComun' ? of([]) : throwError(() => new Error('x')));

      servicio.cargar(7);

      expect(servicio.estado()).toBe('listo');
      expect(servicio.detalle()!.multimediaCasas).toEqual([]);
    });

    it('filtra los lotes de otros proyectos y los ordena', () => {
      lotes.obtenerLotesPublicos.mockReturnValue(of([
        { id: 1, proyectoId: 7, codigo: 'L10' },
        { id: 2, proyectoId: 9, codigo: 'X1' },
        { id: 3, proyectoId: 7, codigo: 'L2' }
      ]));
      servicio.cargar(7);
      expect(servicio.detalle()!.lotes.map(l => l.codigo)).toEqual(['L2', 'L10']);
    });

    it('un fallo en lotes o contenido no tumba la carga', () => {
      lotes.obtenerLotesPublicos.mockReturnValue(throwError(() => new Error('x')));
      contenidos.obtenerPublicadosPorEmpresa.mockReturnValue(throwError(() => new Error('x')));
      multimedia.listarPublicadosPorEntidad.mockReturnValue(throwError(() => new Error('x')));
      servicio.cargar(7);
      expect(servicio.estado()).toBe('listo');
      expect(servicio.detalle()!.lotes).toEqual([]);
      expect(servicio.detalle()!.contenido).toEqual([]);
      expect(servicio.detalle()!.multimedia).toEqual([]);
    });

    it('un error distinto de 404 deja el estado en error', () => {
      proyectos.getProyectoPorId.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      servicio.cargar(7);
      expect(servicio.estado()).toBe('error');
      expect(servicio.detalle()).toBeNull();
    });

    it('mientras carga está en "cargando" y vuelve a vaciar el detalle anterior', () => {
      servicio.detalle.set(vacio());
      const respuesta = new Subject<unknown>();
      proyectos.getProyectoPorId.mockReturnValue(respuesta);
      servicio.cargar(8);
      expect(servicio.estado()).toBe('cargando');
      expect(servicio.detalle()).toBeNull();
    });

    it('una nueva carga cancela la anterior: solo vale la última respuesta', () => {
      const primera = new Subject<unknown>();
      proyectos.getProyectoPorId.mockReturnValueOnce(primera);
      servicio.cargar(1);
      proyectos.getProyectoPorId.mockReturnValueOnce(of({ id: 2, empresaId: 1, nombre: 'Segundo' }));
      servicio.cargar(2);
      primera.next({ id: 1, empresaId: 1, nombre: 'Primero' });
      expect(servicio.detalle()!.proyecto.nombre).toBe('Segundo');
    });
  });

  describe('derivados con detalle vacío o nulo', () => {
    it('sin detalle no hay secciones ni plano ni zonas', () => {
      expect(servicio.secciones()).toEqual([]);
      expect(servicio.imagenPlano()).toBeNull();
      expect(servicio.imagenBeneficios()).toBeNull();
      expect(servicio.imagenesZonas()).toEqual([]);
      expect(servicio.urlGoogleMaps()).toBeNull();
      expect(servicio.imagenZonasDestacadas()).toBeNull();
      expect(servicio.galeria()).toEqual([]);
      expect(servicio.respaldo()).toEqual([]);
      expect(servicio.mapas()).toEqual([]);
      expect(servicio.puntosDe('ENTORNO')).toEqual([]);
      expect(servicio.fotoDeZona(null)).toBeNull();
    });

    it('sin ubicación ninguna vista de ubicación es inmersiva', () => {
      servicio.detalle.set(vacio());
      expect(servicio.esInmersiva('ubicacion', 'entorno-360')).toBe(false);
      expect(servicio.urlGoogleMaps()).toBeNull();
    });

    it('la portada de zonas comunes no es inmersiva sin zonas, ni destacadas ni galería', () => {
      servicio.detalle.set(vacio());
      expect(servicio.esInmersiva('zonas-comunes', null)).toBe(false);
      expect(servicio.esInmersiva('zonas-comunes', 'destacadas')).toBe(false);
      expect(servicio.esInmersiva('zonas-comunes', 'galeria')).toBe(false);
    });

    it('una vista desconocida de ubicación no es inmersiva', () => {
      servicio.detalle.set({ ...vacio(), ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B' } });
      expect(servicio.esInmersiva('ubicacion', 'otra')).toBe(false);
      expect(servicio.esInmersiva('ubicacion', null)).toBe(false);
    });
  });

  describe('plano y galerías', () => {
    it('el plano toma primero el PLANO de multimedia y descarta candidatas que no son imagen', () => {
      servicio.detalle.set({
        ...vacio(),
        ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', urbanismoUrl: 'https://ejemplo.com/tour', vistaAereaUrl: 'https://res.cloudinary.com/x/image/upload/v1/aerea.jpg' },
        multimedia: [mm({ tipo: 'PLANO', url: 'https://x.com/plano.png' })]
      });
      expect(servicio.imagenPlano()).toBe('https://x.com/plano.png');
    });

    it('con candidatas que no son imagen el plano es null', () => {
      servicio.detalle.set({
        ...vacio(),
        ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', urbanismoUrl: 'https://ejemplo.com/tour' }
      });
      expect(servicio.imagenPlano()).toBeNull();
    });

    it('imagenBeneficios devuelve la primera lámina BENEFICIOS', () => {
      servicio.detalle.set({ ...vacio(), multimedia: [mm({ tipo: 'BENEFICIOS', url: 'https://x.com/b.png' })] });
      expect(servicio.imagenBeneficios()).toBe('https://x.com/b.png');
    });

    it('la galería de bienvenida solo trae IMAGEN, por orden (y sin orden cuenta como 0)', () => {
      servicio.detalle.set({
        ...vacio(),
        multimedia: [
          mm({ id: 1, url: 'c.png', orden: 3 }),
          mm({ id: 2, url: 'a.png' }),
          mm({ id: 3, url: 'b.png', orden: 1 }),
          mm({ id: 4, tipo: 'VIDEO', url: 'v.mp4' })
        ]
      });
      expect(servicio.galeria().map(m => m.url)).toEqual(['a.png', 'b.png', 'c.png']);
    });

    it('las láminas de beneficios desempatan por id y toleran orden e id ausentes', () => {
      servicio.detalle.set({
        ...vacio(),
        multimedia: [
          mm({ id: 9, tipo: 'BENEFICIOS', orden: 1, titulo: 'nueve' }),
          mm({ id: 4, tipo: 'BENEFICIOS', orden: 1, titulo: 'cuatro' }),
          mm({ tipo: 'BENEFICIOS', titulo: 'sin orden ni id' })
        ]
      });
      expect(servicio.laminasBeneficios().map(l => l.titulo)).toEqual(['sin orden ni id', 'cuatro', 'nueve']);
    });

    it('las zonas destacadas toman la imagen de menor orden y desempatan por id', () => {
      servicio.detalle.set({
        ...vacio(),
        multimedia: [
          mm({ id: 5, tipo: 'ZONAS_DESTACADAS', url: 'cinco.png', orden: 1 }),
          mm({ id: 2, tipo: 'ZONAS_DESTACADAS', url: 'dos.png', orden: 1 }),
          mm({ tipo: 'ZONAS_DESTACADAS', url: 'sinorden.png' })
        ]
      });
      expect(servicio.imagenZonasDestacadas()).toBe('sinorden.png');
    });

    it('los mapas y el respaldo salen ordenados por el administrador', () => {
      servicio.detalle.set({
        ...vacio(),
        multimedia: [
          mm({ tipo: 'MAPA', url: 'm2.png', orden: 2 }), mm({ tipo: 'MAPA', url: 'm1.png', orden: 1 }),
          mm({ tipo: 'RESPALDO', url: 'r2.png', orden: 2 }), mm({ tipo: 'RESPALDO', url: 'r1.png', orden: 1 })
        ]
      });
      expect(servicio.mapas().map(m => m.url)).toEqual(['m1.png', 'm2.png']);
      expect(servicio.respaldo().map(m => m.url)).toEqual(['r1.png', 'r2.png']);
    });
  });

  describe('imágenes de las zonas comunes', () => {
    const zona = (id: number, nombre: string, urls: string[] = []) => ({
      id, proyectoId: 7, nombre, descripcion: '', publicado: true, activo: true,
      imagenes: urls.map((imagenUrl, i) => ({ id: id * 10 + i, zonaComunId: id, imagenUrl, titulo: i === 0 ? 'Titulo galería' : undefined }))
    });

    it('primero van las de multimedia (la portada antes), luego la galería, sin repetir', () => {
      servicio.detalle.set({
        ...vacio(),
        zonasComunes: [zona(1, 'Piscina', ['g1.jpg', 'sub2.jpg'])],
        multimediaZonas: [
          mm({ id: 1, zonaComunId: 1, url: 'sub1.jpg', orden: 1 }),
          mm({ id: 2, zonaComunId: 1, url: 'sub2.jpg', orden: 2, portada: true, titulo: 'Portada' }),
          mm({ id: 3, zonaComunId: 1, tipo: 'VIDEO', url: 'v.mp4' }),
          mm({ id: 4, zonaComunId: 2, url: 'otra-zona.jpg' })
        ]
      });
      const imagenes = servicio.imagenesZonas();
      expect(imagenes.map(i => i.url)).toEqual(['sub2.jpg', 'sub1.jpg', 'g1.jpg']);
      // El título de la imagen subida o, si no tiene, el de la zona; en la galería, su título o el de la zona
      expect(imagenes.map(i => i.titulo)).toEqual(['Portada', 'Piscina', 'Titulo galería']);
      expect(imagenes.every(i => i.zonaId === 1 && i.zonaNombre === 'Piscina')).toBe(true);
    });

    it('desempata imágenes subidas por orden e id', () => {
      servicio.detalle.set({
        ...vacio(),
        zonasComunes: [zona(1, 'Piscina')],
        multimediaZonas: [
          mm({ id: 8, zonaComunId: 1, url: 'c.jpg', orden: 2 }),
          mm({ id: 7, zonaComunId: 1, url: 'b.jpg', orden: 2 }),
          mm({ id: 6, zonaComunId: 1, url: 'a.jpg', orden: 1 })
        ]
      });
      expect(servicio.imagenesZonas().map(i => i.url)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    });

    it('una zona sin galería ni multimedia no aporta imágenes', () => {
      servicio.detalle.set({ ...vacio(), zonasComunes: [{ ...zona(1, 'Piscina'), imagenes: undefined } as never] });
      expect(servicio.imagenesZonas()).toEqual([]);
    });

    it('sin multimediaZonas definido usa solo la galería', () => {
      servicio.detalle.set({ ...vacio(), multimediaZonas: undefined as never, zonasComunes: [zona(1, 'Piscina', ['g.jpg'])] });
      expect(servicio.imagenesZonas().map(i => i.url)).toEqual(['g.jpg']);
    });

    it('la foto de una zona prefiere la portada subida, luego la principal, la primera de galería y al final la del proyecto', () => {
      servicio.detalle.set({
        ...vacio(),
        proyecto: { ...vacio().proyecto, imagenUrl: 'proyecto.jpg' },
        multimediaZonas: [
          mm({ id: 1, zonaComunId: 1, url: 'normal.jpg', orden: 1 }),
          mm({ id: 2, zonaComunId: 1, url: 'portada.jpg', orden: 5, portada: true })
        ]
      });
      expect(servicio.fotoDeZona(zona(1, 'A', ['g.jpg']))).toBe('portada.jpg');
      expect(servicio.fotoDeZona({ ...zona(2, 'B', ['g.jpg']), imagenPrincipalUrl: 'principal.jpg' })).toBe('principal.jpg');
      expect(servicio.fotoDeZona(zona(3, 'C', ['g.jpg']))).toBe('g.jpg');
      expect(servicio.fotoDeZona(zona(4, 'D'))).toBe('proyecto.jpg');
    });

    it('la foto de una zona sin nada y sin imagen de proyecto es null', () => {
      servicio.detalle.set(vacio());
      expect(servicio.fotoDeZona({ ...zona(4, 'D'), imagenes: undefined } as never)).toBeNull();
    });

    it('desempata las fotos subidas de una zona por orden e id', () => {
      servicio.detalle.set({
        ...vacio(),
        multimediaZonas: [
          mm({ id: 3, zonaComunId: 1, url: 'tres.jpg', orden: 1 }),
          mm({ id: 2, zonaComunId: 1, url: 'dos.jpg', orden: 1 }),
          mm({ zonaComunId: 1, url: 'sinorden.jpg' })
        ]
      });
      expect(servicio.fotoDeZona(zona(1, 'A'))).toBe('sinorden.jpg');
      servicio.detalle.set({ ...servicio.detalle()!, multimediaZonas: servicio.detalle()!.multimediaZonas.slice(0, 2) });
      expect(servicio.fotoDeZona(zona(1, 'A'))).toBe('dos.jpg');
    });
  });

  describe('Google Maps', () => {
    const conUbi = (u: object) => servicio.detalle.set({ ...vacio(), ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', ...u } });

    it('sin coordenadas finitas no arma el mapa', () => {
      conUbi({ googleMapsUrl: 'https://maps.app.goo.gl/abc', latitud: Number.NaN, longitud: 2 });
      expect(servicio.urlGoogleMaps()).toBeNull();
    });

    it('un embed que no es de maps/embed cae a las coordenadas de la ubicación', () => {
      conUbi({ googleMapsUrl: 'https://www.youtube.com/watch?v=abc', latitud: 4, longitud: -75 });
      expect(servicio.urlGoogleMaps()).toContain('q=4.000000,-75.000000');
    });

    it('sin enlace ni coordenadas el mapa y la vista inmersiva no existen', () => {
      conUbi({});
      expect(servicio.urlGoogleMaps()).toBeNull();
      expect(servicio.esInmersiva('ubicacion', 'google-maps')).toBe(false);
    });
  });

  describe('vistas inmersivas', () => {
    const conUbi = (u: object, multimedia: unknown[] = []) =>
      servicio.detalle.set({ ...vacio(), multimedia: multimedia as never, ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', ...u } });

    it('el entorno 360 es inmersivo con un tour de YouTube incrustable', () => {
      conUbi({ recorrido360Url: 'https://youtu.be/abcdef' });
      expect(servicio.esInmersiva('ubicacion', 'entorno-360')).toBe(true);
    });

    it('la vista aérea con un PDF o enlace normal no es inmersiva', () => {
      conUbi({ vistaAereaUrl: 'https://ejemplo.com/aerea' });
      expect(servicio.esInmersiva('ubicacion', 'vista-aerea')).toBe(false);
    });

    it('con imágenes de mapa subidas la vista mapa es inmersiva', () => {
      conUbi({}, [mm({ tipo: 'MAPA', url: 'm.png' })]);
      expect(servicio.esInmersiva('ubicacion', 'mapa')).toBe(true);
    });
  });

  describe('menú', () => {
    it('Bienvenida lista galería, beneficios y video según lo cargado', () => {
      servicio.detalle.set({
        ...vacio(),
        multimedia: [mm({ tipo: 'IMAGEN' }), mm({ tipo: 'VIDEO', url: 'v.mp4' })],
        contenido: [{ id: 1, empresaId: 1, seccion: 'beneficios', titulo: 't', contenido: 'c', publicado: true } as never]
      });
      expect(vistas('bienvenida')).toEqual(['galeria', 'beneficios', 'video']);
      expect(servicio.secciones()[0].subsecciones[0].titulo).toBe('La Hacienda');
    });

    it('Ubicación incluye el mapa con solo coordenadas y urbanismo si hay enlace', () => {
      servicio.detalle.set({ ...vacio(), ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', latitud: 1, longitud: 2, urbanismoUrl: 'u', vistaAereaUrl: 'a' } });
      expect(vistas('ubicacion')).toEqual(['vista-aerea', 'urbanismo', 'mapa']);
    });

    it('Zonas comunes muestra destacadas y galería cuando corresponde', () => {
      servicio.detalle.set({
        ...vacio(),
        zonasComunes: [{ id: 1, proyectoId: 7, nombre: 'P', descripcion: '', publicado: true, activo: true, imagenes: [{ id: 1, zonaComunId: 1, imagenUrl: 'a' }] }],
        multimedia: [mm({ tipo: 'ZONAS_DESTACADAS' })]
      });
      expect(vistas('zonas-comunes')).toEqual(['destacadas', 'galeria']);
    });

    it('Casa modelo ofrece imágenes, planos (de la casa o de multimedia) y tour', () => {
      servicio.detalle.set({
        ...vacio(),
        casasModelo: [{ id: 1, proyectoId: 7, nombre: 'C', publicado: true, activo: true, planoUrl: 'p.png', tourVirtualUrl: 't' }],
        multimediaCasas: [mm({ tipo: 'IMAGEN' })]
      });
      expect(vistas('casa-modelo')).toEqual(['imagenes', 'planos', 'tour-virtual']);

      servicio.detalle.set({
        ...vacio(),
        casasModelo: [{ id: 1, proyectoId: 7, nombre: 'C', publicado: true, activo: true }],
        multimediaCasas: [mm({ tipo: 'PLANO' })]
      });
      expect(vistas('casa-modelo')).toEqual(['planos']);
    });

    it('las etapas sin nombre se titulan "Etapa N" y los lotes sin etapa no generan vista', () => {
      servicio.detalle.set({
        ...vacio(),
        lotes: [
          { id: 1, codigo: 'L1', areaM2: 100, activo: true, estadoId: 1, etapaId: 2 },
          { id: 2, codigo: 'L2', areaM2: 100, activo: true, estadoId: 1, etapaId: 2, etapaNombre: 'Otra' },
          { id: 3, codigo: 'L3', areaM2: 100, activo: true, estadoId: 1 }
        ] as never
      });
      expect(servicio.secciones().find(s => s.id === 'disponibilidad')!.subsecciones).toEqual([{ id: '2', titulo: 'Etapa 2' }]);
    });

    it('con el video de cómo llegar y videos del proyecto, Videos ofrece ambas vistas', () => {
      servicio.detalle.set({
        ...vacio(),
        ubicacion: { proyectoId: 7, ciudad: 'T', departamento: 'B', videoComoLlegarUrl: 'v' },
        multimedia: [mm({ tipo: 'VIDEO', url: 'v.mp4' })]
      });
      expect(vistas('videos')).toEqual(['proyecto', 'como-llegar']);
    });
  });

  describe('idioma inglés', () => {
    it('los textos del detalle y los títulos del menú cambian al inglés', async () => {
      const idioma = TestBed.inject(IdiomaService);
      servicio.detalle.set({
        ...vacio(),
        proyecto: { ...vacio().proyecto, descripcion: 'Hola', descripcionEn: 'Hello' },
        lotes: [{ id: 1, codigo: 'L1', areaM2: 800, activo: true, estadoId: 1, etapaId: 1, etapaNombre: 'Etapa 01 - Río' }] as never
      });
      expect(servicio.detalleLocal()!.proyecto.descripcion).toBe('Hola');
      const titulosEs = servicio.secciones().map(s => s.titulo);

      idioma.cambiar('en', false);
      await vi.waitFor(() => expect(idioma.idioma()).toBe('en'), { timeout: 5000 });

      expect(servicio.detalleLocal()!.proyecto.descripcion).toBe('Hello');
      expect(servicio.detalleLocal()!.lotes[0].etapaNombre).toBe('Stage 01 - Río');
      expect(servicio.secciones().map(s => s.titulo)).not.toEqual(titulosEs);
      expect(servicio.secciones().find(s => s.id === 'disponibilidad')!.subsecciones[0].titulo).toBe('Stage 01 - Río');
    });

    it('la imagen con texto usa su versión en inglés cuando existe', async () => {
      const idioma = TestBed.inject(IdiomaService);
      servicio.detalle.set({
        ...vacio(),
        multimedia: [mm({ tipo: 'PLANO', url: 'https://x.com/es.png', urlEn: 'https://x.com/en.png' })]
      });
      expect(servicio.imagenPlano()).toBe('https://x.com/es.png');
      idioma.cambiar('en', false);
      await vi.waitFor(() => expect(idioma.idioma()).toBe('en'), { timeout: 5000 });
      expect(servicio.imagenPlano()).toBe('https://x.com/en.png');
    });
  });
});
