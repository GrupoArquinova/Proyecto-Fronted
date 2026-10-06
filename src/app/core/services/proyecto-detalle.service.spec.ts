import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProyectoDetalleService } from './proyecto-detalle.service';
import { ProyectoDetalle } from '../models/proyecto-detalle.models';

const detalleVacio = (): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: null,
  zonasComunes: [],
  casasModelo: [],
  lotes: [],
  multimedia: [],
  contenido: []
});

describe('ProyectoDetalleService', () => {
  let service: ProyectoDetalleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProyectoDetalleService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProyectoDetalleService);
    http = TestBed.inject(HttpTestingController);
  });

  const ids = () => service.secciones().map(s => s.id);

  describe('menu', () => {
    it('sin contenido solo ofrece Bienvenida y Contacto', () => {
      service.detalle.set(detalleVacio());
      expect(ids()).toEqual(['bienvenida', 'contacto']);
    });

    it('agrega cada seccion solo cuando el administrador cargo su contenido', () => {
      service.detalle.set({
        ...detalleVacio(),
        ubicacion: { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá', recorrido360Url: 'x', googleMapsUrl: 'y' },
        zonasComunes: [{ proyectoId: 7, nombre: 'Piscina', descripcion: '', publicado: true, activo: true }],
        casasModelo: [{ proyectoId: 7, nombre: 'Casa', publicado: true, activo: true, tourVirtualUrl: 'z' }],
        lotes: [{ codigo: 'L1', areaM2: 800, activo: true, estadoId: 1, etapaId: 1, etapaNombre: 'Etapa B' }],
        multimedia: [{ tipo: 'RESPALDO', url: 'https://x.com/respaldo.png', portada: false, publicado: true, activo: true }]
      });

      expect(ids()).toEqual([
        'bienvenida', 'respaldo', 'ubicacion', 'zonas-comunes', 'lotes', 'casa-modelo', 'disponibilidad', 'contacto'
      ]);
    });

    it('en Ubicacion solo lista las vistas que tienen dato', () => {
      service.detalle.set({
        ...detalleVacio(),
        ubicacion: { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá', recorrido360Url: 'x', googleMapsUrl: 'y' }
      });

      const ubicacion = service.secciones().find(s => s.id === 'ubicacion')!;
      expect(ubicacion.subsecciones.map(v => v.id)).toEqual(['entorno-360', 'google-maps']);
    });

    it('Videos aparece con videos del proyecto o con el video de como llegar', () => {
      service.detalle.set({
        ...detalleVacio(),
        ubicacion: { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá', videoComoLlegarUrl: 'v' }
      });

      const videos = service.secciones().find(s => s.id === 'videos')!;
      expect(videos.subsecciones.map(v => v.id)).toEqual(['como-llegar']);
    });

    it('Disponibilidad tiene una vista por etapa, ordenadas por nombre', () => {
      const lote = (etapaId: number, etapaNombre: string) =>
        ({ codigo: `L${etapaId}`, areaM2: 1, activo: true, estadoId: 1, etapaId, etapaNombre });
      service.detalle.set({
        ...detalleVacio(),
        lotes: [lote(3, 'Etapa D'), lote(1, 'Etapa B'), lote(2, 'Etapa C'), lote(1, 'Etapa B')]
      });

      const disponibilidad = service.secciones().find(s => s.id === 'disponibilidad')!;
      expect(disponibilidad.subsecciones.map(v => v.titulo)).toEqual(['Etapa B', 'Etapa C', 'Etapa D']);
    });
  });

  describe('lotes y plano', () => {
    const lote = (id: number, codigo: string, areaM2 = 800) =>
      ({ id, codigo, areaM2, activo: true, estadoId: 1, etapaId: 1, etapaNombre: 'Etapa B' });

    it('Lotes tiene una vista por lote con codigo y area', () => {
      service.detalle.set({ ...detalleVacio(), lotes: [lote(10, 'L1', 800), lote(11, 'L2', 1100)] });

      const lotes = service.secciones().find(s => s.id === 'lotes')!;
      expect(lotes.subsecciones.map(v => v.id)).toEqual(['10', '11']);
      expect(lotes.subsecciones[0].titulo).toContain('L1');
      expect(lotes.subsecciones[0].titulo).toContain('800');
    });

    it('el plano sale primero de multimedia PLANO, luego de urbanismo y luego de la vista aerea', () => {
      const ubicacion = { proyectoId: 7, ciudad: 'x', departamento: 'y',
        urbanismoUrl: 'https://x.com/urbanismo.jpg', vistaAereaUrl: 'https://x.com/aerea.jpg' };

      service.detalle.set({ ...detalleVacio(), ubicacion });
      expect(service.imagenPlano()).toBe('https://x.com/urbanismo.jpg');

      service.detalle.set({ ...detalleVacio(), ubicacion,
        multimedia: [{ tipo: 'PLANO', url: 'https://x.com/plano.png', portada: false, publicado: true, activo: true }] });
      expect(service.imagenPlano()).toBe('https://x.com/plano.png');
    });

    it('un video o un PDF no sirven como fondo del plano', () => {
      service.detalle.set({ ...detalleVacio(),
        ubicacion: { proyectoId: 7, ciudad: 'x', departamento: 'y',
          urbanismoUrl: 'https://x.com/urbanismo.pdf', vistaAereaUrl: 'https://x.com/aerea.mp4' } });
      expect(service.imagenPlano()).toBeNull();
    });
  });

  describe('respaldo y beneficios', () => {
    const texto = (seccion: string) => ({ empresaId: 1, seccion, titulo: seccion, contenido: 'c', publicado: true });
    const lamina = (tipo: 'RESPALDO' | 'BENEFICIOS', url: string, orden = 1) =>
      ({ tipo, url, orden, portada: false, publicado: true, activo: true });

    it('un texto BENEFICIOS alimenta Bienvenida pero no abre Respaldo por si solo', () => {
      service.detalle.set({ ...detalleVacio(), contenido: [texto('BENEFICIOS')] });

      expect(ids()).not.toContain('respaldo');
      const bienvenida = service.secciones().find(s => s.id === 'bienvenida')!;
      expect(bienvenida.subsecciones.map(v => v.id)).toContain('beneficios');
    });

    it('el texto institucional de la empresa ya no abre Respaldo: es propio de cada proyecto', () => {
      service.detalle.set({ ...detalleVacio(), contenido: [texto('TRAYECTORIA'), texto('MISION')] });

      expect(ids()).not.toContain('respaldo');
    });

    it('Respaldo aparece solo cuando el proyecto tiene laminas RESPALDO, en el orden del administrador', () => {
      expect(ids()).not.toContain('respaldo');

      service.detalle.set({
        ...detalleVacio(),
        multimedia: [lamina('RESPALDO', 'https://x.com/2.png', 2), lamina('RESPALDO', 'https://x.com/1.png', 1)]
      });

      expect(ids()).toContain('respaldo');
      expect(service.respaldo().map(l => l.url)).toEqual(['https://x.com/1.png', 'https://x.com/2.png']);
    });

    it('una lamina BENEFICIOS abre la vista Beneficios aunque no haya texto', () => {
      service.detalle.set({ ...detalleVacio(), multimedia: [lamina('BENEFICIOS', 'https://x.com/b.png')] });

      const bienvenida = service.secciones().find(s => s.id === 'bienvenida')!;
      expect(bienvenida.subsecciones.map(v => v.id)).toContain('beneficios');
      expect(service.imagenBeneficios()).toBe('https://x.com/b.png');
    });
  });

  describe('cargar', () => {
    it('queda en no-encontrado si el proyecto responde 404', () => {
      service.cargar(99);
      http.expectOne(r => r.url.endsWith('/proyectos/99')).flush(null, { status: 404, statusText: 'Not Found' });

      expect(service.estado()).toBe('no-encontrado');
      expect(service.detalle()).toBeNull();
    });

    it('una consulta secundaria que falla no impide mostrar el proyecto', () => {
      service.cargar(7);
      http.expectOne(r => r.url.endsWith('/proyectos/7'))
        .flush({ id: 7, empresaId: 1, nombre: 'La Hacienda', publicado: true });

      http.expectOne(r => r.url.endsWith('/ubicaciones/proyecto/7')).flush(null, { status: 404, statusText: 'Not Found' });
      http.expectOne(r => r.url.endsWith('/zonas-comunes/proyecto/7/publicas')).flush(null, { status: 500, statusText: 'Error' });
      http.expectOne(r => r.url.endsWith('/casas-modelo/proyecto/7/publicas')).flush([]);
      http.expectOne(r => r.url.endsWith('/lotes/publicos')).flush([
        { id: 1, proyectoId: 7, codigo: 'L1' }, { id: 2, proyectoId: 8, codigo: 'X' }
      ]);
      http.expectOne(r => r.url.endsWith('/multimedia/proyecto/7')).flush([]);
      http.expectOne(r => r.url.endsWith('/contenidos-institucionales/empresa/1')).flush([]);

      expect(service.estado()).toBe('listo');
      expect(service.detalle()!.zonasComunes).toEqual([]);
      expect(service.detalle()!.ubicacion).toBeNull();
      expect(service.detalle()!.lotes.map(l => l.codigo)).toEqual(['L1']);
    });
  });
});
