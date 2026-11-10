import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideI18nPruebas } from '../../i18n/pruebas';
import { environment } from '../../../environments/environment';
import { CasaModeloService } from './casa-modelo.service';
import { CloudinaryService } from './cloudinary.service';
import { ArchivoInvalidoError } from '../utils/archivos';
import { ConfirmDialogService } from './confirm-dialog.service';
import { ContenidoService } from './contenido.service';
import { EtapaService } from './etapa.service';
import { LoteService } from './lote.service';
import { Punto360Service } from './punto-360.service';
import { ReporteService } from './reporte.service';
import { SolicitudService } from './solicitud.service';
import { ToastService } from './toast.service';
import { UbicacionService } from './ubicacion.service';
import { ZonaComunImagenService } from './zona-comun-imagen.service';
import { ZonaComunService } from './zona-comun.service';

const API = environment.apiUrl;

describe('servicios HTTP del panel: cada método pide la dirección y el verbo correctos', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Llama al método, comprueba verbo, dirección y cuerpo, y responde. */
  function probar(llamada: () => { subscribe: (fn: (v: unknown) => void) => unknown }, metodo: string, url: string, cuerpo?: unknown) {
    let respuesta: unknown;
    llamada().subscribe(v => (respuesta = v));
    const peticion = http.expectOne(r => r.method === metodo && r.urlWithParams === `${API}${url}`);
    if (cuerpo !== undefined) expect(peticion.request.body).toEqual(cuerpo);
    if (peticion.request.responseType === 'blob') {
      peticion.flush(new Blob(['archivo']));
      expect(respuesta).toBeInstanceOf(Blob);
    } else {
      peticion.flush({ ok: true });
      expect(respuesta).toEqual({ ok: true });
    }
  }

  it('casas modelo (tipologías)', () => {
    const s = TestBed.inject(CasaModeloService);
    const casa = { proyectoId: 1, nombre: 'A', publicado: true, activo: true };
    probar(() => s.listar(), 'GET', '/casas-modelo');
    probar(() => s.listarPorProyecto(6), 'GET', '/casas-modelo/proyecto/6');
    probar(() => s.listarPublicasPorProyecto(6), 'GET', '/casas-modelo/proyecto/6/publicas');
    probar(() => s.obtenerPorId(3), 'GET', '/casas-modelo/3');
    probar(() => s.crear(casa), 'POST', '/casas-modelo', casa);
    probar(() => s.actualizar(3, casa), 'PUT', '/casas-modelo/3', casa);
    probar(() => s.eliminar(3), 'DELETE', '/casas-modelo/3');
  });

  it('contenido institucional', () => {
    const s = TestBed.inject(ContenidoService);
    probar(() => s.obtenerContenidosPorEmpresa(1), 'GET', '/contenidos-institucionales/empresa/1');
    probar(() => s.obtenerPublicadosPorEmpresa(1), 'GET', '/contenidos-institucionales/empresa/1?soloPublicados=true');
    probar(() => s.guardarSeccion({ seccion: 'MISION' } as never), 'POST', '/contenidos-institucionales', { seccion: 'MISION' });
    probar(() => s.actualizarSeccion(4, { titulo: 'Nuevo' }), 'PUT', '/contenidos-institucionales/4', { titulo: 'Nuevo' });
    probar(() => s.eliminarSeccion(4), 'DELETE', '/contenidos-institucionales/4');
  });

  it('etapas', () => {
    const s = TestBed.inject(EtapaService);
    const etapa = { proyectoId: 1, nombre: 'Etapa 1' } as never;
    probar(() => s.obtenerEtapas(), 'GET', '/etapas');
    probar(() => s.listarPorProyecto(6), 'GET', '/etapas/proyecto/6');
    probar(() => s.crearEtapa(etapa), 'POST', '/etapas', etapa);
    probar(() => s.actualizarEtapa(2, etapa), 'PUT', '/etapas/2', etapa);
    probar(() => s.eliminarEtapa(2), 'DELETE', '/etapas/2');
  });

  it('lotes', () => {
    const s = TestBed.inject(LoteService);
    probar(() => s.obtenerLotes(), 'GET', '/lotes');
    probar(() => s.obtenerLotesPublicos(), 'GET', '/lotes/publicos');
    probar(() => s.cambiarEstado(5, 2), 'PATCH', '/lotes/5/estado', { estadoId: 2 });
    probar(() => s.toggleActivo(5, false), 'PATCH', '/lotes/5/activo', { activo: false });
    probar(() => s.crearLote({ codigo: 'LT-01' }), 'POST', '/lotes', { codigo: 'LT-01' });
    probar(() => s.actualizarLote(5, { codigo: 'LT-02' }), 'PUT', '/lotes/5', { codigo: 'LT-02' });
    probar(() => s.eliminarLote(5), 'DELETE', '/lotes/5');
    probar(() => s.obtenerEtapas(), 'GET', '/etapas');
  });

  it('solicitudes de contacto: el envío público lleva el idioma del sitio', () => {
    const s = TestBed.inject(SolicitudService);
    probar(() => s.obtenerSolicitudes(), 'GET', '/solicitudes-contacto');
    probar(() => s.obtenerEstados(), 'GET', '/estados-solicitud/activos');
    probar(() => s.enviarSolicitud({ nombre: 'Ana', proyectoId: 6, consentimientoDatos: true }), 'POST', '/solicitudes-contacto/publico',
      { nombre: 'Ana', proyectoId: 6, consentimientoDatos: true, idioma: 'es' });
    probar(() => s.atenderSolicitud(8, { estadoId: 2 }), 'PATCH', '/solicitudes-contacto/8/atender', { estadoId: 2 });
    probar(() => s.eliminarSolicitud(8), 'DELETE', '/solicitudes-contacto/8');
  });

  it('ubicaciones: un 404 significa "no tiene ubicación" y otros errores sí se propagan', () => {
    const s = TestBed.inject(UbicacionService);
    probar(() => s.obtenerUbicaciones(), 'GET', '/ubicaciones');
    probar(() => s.obtenerPorProyecto(6), 'GET', '/ubicaciones/proyecto/6');
    probar(() => s.obtenerUbicacionPorId(2), 'GET', '/ubicaciones/2');
    probar(() => s.crearUbicacion({ proyectoId: 6 } as never), 'POST', '/ubicaciones', { proyectoId: 6 });
    probar(() => s.actualizarUbicacion(2, { proyectoId: 6 } as never), 'PUT', '/ubicaciones/2', { proyectoId: 6 });
    probar(() => s.eliminarUbicacion(2), 'DELETE', '/ubicaciones/2');

    let sin: unknown = 'pendiente';
    s.obtenerPorProyecto(7).subscribe(v => (sin = v));
    http.expectOne(`${API}/ubicaciones/proyecto/7`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(sin).toBeNull();

    let error: unknown = null;
    s.obtenerPorProyecto(8).subscribe({ error: e => (error = e) });
    http.expectOne(`${API}/ubicaciones/proyecto/8`).flush(null, { status: 500, statusText: 'Error' });
    expect((error as { status: number }).status).toBe(500);
  });

  it('amenidades (zonas comunes) y sus imágenes', () => {
    const z = TestBed.inject(ZonaComunService);
    const zona = { proyectoId: 1, nombre: 'Jacuzzi' } as never;
    probar(() => z.listarPorProyecto(6), 'GET', '/zonas-comunes/proyecto/6');
    probar(() => z.listarPublicasPorProyecto(6), 'GET', '/zonas-comunes/proyecto/6/publicas');
    probar(() => z.crear(zona), 'POST', '/zonas-comunes', zona);
    probar(() => z.actualizar(4, zona), 'PUT', '/zonas-comunes/4', zona);
    probar(() => z.eliminar(4), 'DELETE', '/zonas-comunes/4');

    const i = TestBed.inject(ZonaComunImagenService);
    const imagen = { zonaComunId: 4, imagenUrl: 'a.jpg' } as never;
    probar(() => i.listarPorZona(4), 'GET', '/zonas-comunes-imagenes/zona-comun/4');
    probar(() => i.crear(imagen), 'POST', '/zonas-comunes-imagenes', imagen);
    probar(() => i.eliminar(9), 'DELETE', '/zonas-comunes-imagenes/9');
    probar(() => i.marcarComoPrincipal(9), 'PATCH', '/zonas-comunes-imagenes/9/principal', {});
    probar(() => i.actualizar(9, imagen), 'PUT', '/zonas-comunes-imagenes/9', imagen);
  });

  it('puntos 360° (con o sin escena)', () => {
    const s = TestBed.inject(Punto360Service);
    const punto = { proyectoId: 6, escena: 'URBANISMO', etiqueta: 'A' } as never;
    probar(() => s.listarPorProyecto(6), 'GET', '/puntos-360/proyecto/6');
    probar(() => s.listarPorProyecto(6, 'URBANISMO'), 'GET', '/puntos-360/proyecto/6?escena=URBANISMO');
    probar(() => s.crear(punto), 'POST', '/puntos-360', punto);
    probar(() => s.actualizar(3, punto), 'PUT', '/puntos-360/3', punto);
    probar(() => s.eliminar(3), 'DELETE', '/puntos-360/3');
  });

  it('reportes: consultas con filtros y descargas', () => {
    const s = TestBed.inject(ReporteService);
    probar(() => s.getDashboard(), 'GET', '/reportes/dashboard');
    probar(() => s.getReporteLotes(), 'GET', '/reportes/lotes');
    probar(() => s.getReporteLotes({ proyectoId: 1, estadoLoteId: 2, incluirInactivos: true, fechaInicio: '' }), 'GET',
      '/reportes/lotes?proyectoId=1&estadoLoteId=2&incluirInactivos=true');
    probar(() => s.getReporteProyectos(), 'GET', '/reportes/proyectos');
    probar(() => s.getReporteEtapas(), 'GET', '/reportes/etapas');
    probar(() => s.getEstadosComerciales(), 'GET', '/reportes/estados-comerciales');
    probar(() => s.getReporteSolicitudes({ estadoSolicitudId: 3 }), 'GET', '/reportes/solicitudes?estadoSolicitudId=3');
    probar(() => s.getReporteActividad({ fechaInicio: '2026-10-01', incluirInactivos: false }), 'GET', '/reportes/actividad?fechaInicio=2026-10-01');
    probar(() => s.exportar('excel', 'lotes', { proyectoId: 1 }), 'GET', '/documentos/excel/lotes?proyectoId=1');
    probar(() => s.exportar('pdf', 'estados-comerciales'), 'GET', '/documentos/pdf/estados-comerciales');
    probar(() => s.descargarExcelLotes(), 'GET', '/documentos/excel/lotes');
    probar(() => s.descargarExcelProyectos(), 'GET', '/documentos/excel/proyectos');
    probar(() => s.descargarExcelSolicitudes(), 'GET', '/documentos/excel/solicitudes');
    probar(() => s.descargarFichaProyectoPdf(6), 'GET', '/documentos/pdf/proyecto/6/ficha-tecnica');
  });
});

describe('CloudinaryService', () => {
  let http: HttpTestingController;
  let cloudinary: CloudinaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    cloudinary = TestBed.inject(CloudinaryService);
  });

  afterEach(() => http.verify());

  const firma = { cloudName: 'nube', apiKey: 'k', timestamp: 123, folder: 'arquinova', signature: 'firma' };

  /** Cabecera real de un PNG: la subida comprueba los primeros bytes, no solo el tipo declarado. */
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const esperarFirma = () => vi.waitFor(() => http.expectOne(`${API}/cloudinary/firma`));

  it('pide la firma al backend y sube el archivo directo a Cloudinary con esa firma', async () => {
    let resultado: unknown;
    cloudinary.subirArchivo(new File([PNG], 'foto.png', { type: 'image/png' })).subscribe(r => (resultado = r));

    (await esperarFirma()).flush(firma);
    const subida = http.expectOne('https://api.cloudinary.com/v1_1/nube/auto/upload');
    const datos = subida.request.body as FormData;
    expect(datos.get('api_key')).toBe('k');
    expect(datos.get('timestamp')).toBe('123');
    expect(datos.get('signature')).toBe('firma');
    expect(datos.get('folder')).toBe('arquinova');
    expect((datos.get('file') as File).name).toBe('foto.png');
    subida.flush({ secure_url: 'https://res.cloudinary.com/nube/foto.png', resource_type: 'image' });

    expect(resultado).toEqual({ url: 'https://res.cloudinary.com/nube/foto.png', resourceType: 'image' });
  });

  it('sin carpeta no la envía, y subirImagen devuelve solo la URL', async () => {
    let url = '';
    cloudinary.subirImagen(new File([PNG], 'a.png', { type: 'image/png' })).subscribe(u => (url = u));

    (await esperarFirma()).flush({ ...firma, folder: '' });
    const subida = http.expectOne('https://api.cloudinary.com/v1_1/nube/auto/upload');
    expect((subida.request.body as FormData).has('folder')).toBe(false);
    subida.flush({ secure_url: 'https://res.cloudinary.com/nube/a.png', resource_type: 'image' });

    expect(url).toBe('https://res.cloudinary.com/nube/a.png');
  });

  it.each([
    ['un SVG', new File(['<svg onload="alert(1)"/>'], 'x.svg', { type: 'image/svg+xml' }), /SVG/],
    ['un SVG disfrazado de PNG', new File(['<svg/>'], 'x.svg', { type: 'image/png' }), /SVG/],
    ['un PNG falso (el contenido no es una imagen)', new File(['<html>'], 'foto.png', { type: 'image/png' }), /contenido/],
    ['un ejecutable', new File(['MZ'], 'a.exe', { type: 'application/x-msdownload' }), /no es válido/],
    ['un PDF falso', new File(['hola'], 'a.pdf', { type: 'application/pdf' }), /PDF/]
  ])('rechaza %s sin pedir firma ni subir nada', async (_n, archivo, mensaje) => {
    const error = await new Promise<unknown>(resolve => cloudinary.subirArchivo(archivo).subscribe({ error: resolve }));
    expect(error).toBeInstanceOf(ArchivoInvalidoError);
    expect((error as Error).message).toMatch(mensaje);
    http.expectNone(`${API}/cloudinary/firma`);
  });

  it('subirImagen no admite un PDF aunque sea válido', async () => {
    const pdf = new File(['%PDF-1.7'], 'a.pdf', { type: 'application/pdf' });
    const error = await new Promise<unknown>(resolve => cloudinary.subirImagen(pdf).subscribe({ error: resolve }));
    expect(error).toBeInstanceOf(ArchivoInvalidoError);
  });
});

describe('ConfirmDialogService', () => {
  it('open() abre el diálogo con los textos por defecto y confirm() responde true', async () => {
    const s = TestBed.inject(ConfirmDialogService);

    const respuesta = s.open({ title: 'Eliminar', message: '¿Seguro?' });
    expect(s.isOpen()).toBe(true);
    expect(s.config()).toMatchObject({ title: 'Eliminar', confirmText: 'Confirmar', cancelText: 'Cancelar', type: 'danger' });

    s.confirm();
    expect(s.isOpen()).toBe(false);
    expect(await respuesta).toBe(true);
  });

  it('cancel() responde false y los textos propios reemplazan a los de por defecto', async () => {
    const s = TestBed.inject(ConfirmDialogService);

    const respuesta = s.open({ title: 'Quitar', message: 'x', confirmText: 'Sí, quitar', type: 'warning' });
    expect(s.config()).toMatchObject({ confirmText: 'Sí, quitar', type: 'warning' });
    s.cancel();

    expect(await respuesta).toBe(false);
    expect(s.isOpen()).toBe(false);
  });

  it('confirm() o cancel() sin un diálogo abierto no fallan', () => {
    const s = TestBed.inject(ConfirmDialogService);
    expect(() => { s.confirm(); s.cancel(); }).not.toThrow();
  });
});

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra los tres tipos de aviso y cada uno desaparece solo a los 4 segundos', () => {
    const s = TestBed.inject(ToastService);

    s.showSuccess('Listo');
    s.showError('Falló');
    s.showInfo('Ojo');
    expect(s.toasts().map(t => [t.type, t.message])).toEqual([['success', 'Listo'], ['error', 'Falló'], ['info', 'Ojo']]);

    vi.advanceTimersByTime(3999);
    expect(s.toasts().length).toBe(3);
    vi.advanceTimersByTime(1);
    expect(s.toasts().length).toBe(0);
  });

  it('removeToast quita solo el aviso indicado', () => {
    const s = TestBed.inject(ToastService);
    s.showInfo('A');
    s.showInfo('B');
    const [primero, segundo] = s.toasts();

    s.removeToast(primero.id);

    expect(s.toasts()).toEqual([segundo]);
  });
});
