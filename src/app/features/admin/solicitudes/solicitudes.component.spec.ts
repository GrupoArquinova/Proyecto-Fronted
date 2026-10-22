import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SolicitudesComponent } from './solicitudes.component';
import { ToastService } from '../../../core/services/toast.service';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { environment } from '../../../../environments/environment';

const SOLICITUDES = `${environment.apiUrl}/solicitudes-contacto`;
const ESTADOS = `${environment.apiUrl}/estados-solicitud/activos`;

const estados = [
  { id: 3, nombre: 'CERRADO', orden: 3, activo: true },
  { id: 1, nombre: 'NUEVO', orden: 1, activo: true },
  { id: 4, nombre: 'ARCHIVADO', orden: 4, activo: false },
  { id: 2, nombre: 'EN_GESTION', orden: 2, activo: true },
];

const solicitudes = [
  {
    id: 10, estadoId: 1, estadoNombre: 'NUEVO', nombre: 'María Rojas', correo: 'maria@correo.com', telefono: '3001234567',
    proyectoNombre: 'El Encanto', loteCodigo: 'LT-104', casaModeloNombre: 'Villa Samán', servicioInteres: 'Diseño',
    mensaje: 'Quiero información', consentimientoDatos: true, creadoEn: '2026-10-01T09:00:00',
    observacionesInternas: 'Llamar el lunes', atendidaPorNombre: 'Ana', atendidaEn: '2026-10-02T15:30:00',
  },
  { id: 11, estadoId: 3, estadoNombre: 'CERRADO', nombre: 'Pedro Gil', consentimientoDatos: true, creadoEn: '2026-10-03T09:00:00' },
  { id: 12, estadoId: 2, nombre: 'Sara Díaz', telefono: '123', correo: 'sara@correo.com', consentimientoDatos: true, creadoEn: '2026-10-04T09:00:00', atendidaEn: '2026-10-05T10:00:00' },
];

describe('SolicitudesComponent', () => {
  let http: HttpTestingController;

  function crear(opciones: { solicitudes?: unknown[]; fallar?: ('estados' | 'solicitudes')[] } = {}) {
    TestBed.configureTestingModule({
      imports: [SolicitudesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()],
    });
    const fixture = TestBed.createComponent(SolicitudesComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const error = { status: 500, statusText: 'Error' };
    const e = http.expectOne(ESTADOS);
    if (opciones.fallar?.includes('estados')) e.flush(null, error);
    else e.flush(structuredClone(estados));
    const s = http.expectOne(SOLICITUDES);
    if (opciones.fallar?.includes('solicitudes')) s.flush(null, error);
    else s.flush(structuredClone(opciones.solicitudes ?? solicitudes));
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  describe('carga', () => {
    it('muestra los estados activos ordenados en los filtros y una tarjeta por solicitud', () => {
      const { el, componente } = crear();

      expect(componente.estados.map((e) => e.nombre)).toEqual(['NUEVO', 'EN_GESTION', 'CERRADO']);
      const filtros = Array.from(el.querySelectorAll('.btn-filtro')).map((b) => b.textContent?.trim());
      expect(filtros).toEqual(['Todas', 'Nuevas', 'En gestión', 'Cerradas']);
      expect(el.querySelectorAll('.solicitud-card').length).toBe(3);
      expect(el.querySelector('.loading-state')).toBeNull();
      expect(el.querySelector('.empty-state')).toBeNull();
    });

    it('si falla la carga de estados y solicitudes avisa y muestra el estado vacío', () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { el, componente } = crear({ fallar: ['estados', 'solicitudes'] });

      const mensajes = avisos().map((t) => t.message);
      expect(mensajes).toContain('No se pudieron cargar los estados de las solicitudes');
      expect(mensajes).toContain('Error al cargar las solicitudes');
      expect(consola).toHaveBeenCalledTimes(2);
      expect(componente.cargando).toBe(false);
      expect(el.querySelector('.empty-state')?.textContent).toContain('No hay solicitudes registradas');
    });

    it('mientras carga muestra el aviso de carga y no el de vacío', () => {
      TestBed.configureTestingModule({ imports: [SolicitudesComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()] });
      const fixture = TestBed.createComponent(SolicitudesComponent);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando solicitudes');
      expect(el.querySelector('.empty-state')).toBeNull();

      http.expectOne(ESTADOS).flush([]);
      http.expectOne(SOLICITUDES).flush([]);
    });
  });

  describe('tarjeta', () => {
    it('muestra contacto, interés, mensaje, nota interna y quién la atendió', () => {
      const { el } = crear();
      const tarjeta = el.querySelectorAll('.solicitud-card')[0];

      expect(tarjeta.querySelector('h3')?.textContent).toBe('María Rojas');
      expect(tarjeta.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')?.getAttribute('href')).toBe('mailto:maria@correo.com');
      expect(tarjeta.querySelector<HTMLAnchorElement>('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:3001234567');
      expect(tarjeta.querySelector<HTMLAnchorElement>('.wa-link')?.getAttribute('href')).toBe('https://wa.me/573001234567');
      expect(tarjeta.querySelector('.badge')?.textContent?.trim()).toBe('Nuevo');
      expect(tarjeta.querySelector('.badge')?.classList).toContain('estado-nuevo');
      expect(tarjeta.querySelector('.fecha')?.textContent).toContain('2026-10-01');
      const interes = tarjeta.querySelector('.interes-info')?.textContent ?? '';
      expect(interes).toContain('Proyecto: El Encanto');
      expect(interes).toContain('Servicio: Diseño');
      expect(interes).toContain('Villa: Villa Samán');
      expect(interes).toContain('Lote: LT-104');
      expect(tarjeta.querySelector('.mensaje-box')?.textContent).toContain('Quiero información');
      expect(tarjeta.querySelector('.notas-internas')?.textContent).toContain('Llamar el lunes');
      expect(tarjeta.querySelector('.atencion-info')?.textContent).toContain('Atendida por Ana');
      expect(tarjeta.querySelector('.atencion-info')?.textContent).toContain('2026-10-02 15:30');
      expect(tarjeta.querySelector('.contacto-links span')?.textContent).toContain('•');
    });

    it('una solicitud sin datos opcionales no muestra interés, notas, atención ni enlaces', () => {
      const { el } = crear();
      const tarjeta = el.querySelectorAll('.solicitud-card')[1];

      expect(tarjeta.querySelector('.interes-info')).toBeNull();
      expect(tarjeta.querySelector('.notas-internas')).toBeNull();
      expect(tarjeta.querySelector('.atencion-info')).toBeNull();
      expect(tarjeta.querySelector('.contacto-links a')).toBeNull();
      expect(tarjeta.querySelector('.mensaje-box')?.textContent).toContain('Sin mensaje especificado.');
      expect(tarjeta.querySelector('.badge')?.textContent?.trim()).toBe('Cerrado');
    });

    it('sin nombre de estado la etiqueta cae en "Nuevo" y la atención sin nombre dice "Sin registrar"', () => {
      const { el } = crear();
      const tarjeta = el.querySelectorAll('.solicitud-card')[2];

      expect(tarjeta.querySelector('.badge')?.textContent?.trim()).toBe('Nuevo');
      expect(tarjeta.querySelector('.atencion-info')?.textContent).toContain('Sin registrar');
      expect(tarjeta.querySelector('.wa-link')).toBeNull(); // teléfono de 3 dígitos: no sirve para WhatsApp
    });

    it('marca como seleccionado el estado actual en los botones de cambio', () => {
      const { el } = crear();
      const botones = el.querySelectorAll('.solicitud-card')[0].querySelectorAll('.btn-estado');

      expect(Array.from(botones).map((b) => b.textContent?.trim())).toEqual(['Nuevo', 'En gestión', 'Cerrado']);
      expect(botones[0].classList).toContain('seleccionado');
      expect(botones[1].classList).not.toContain('seleccionado');
    });
  });

  describe('enlace de WhatsApp', () => {
    it('agrega 57 a un celular colombiano de 10 dígitos y respeta los números con indicativo', () => {
      const { componente } = crear();

      expect(componente.enlaceWhatsapp('300 123 4567')).toBe('https://wa.me/573001234567');
      expect(componente.enlaceWhatsapp('+57 300 123 4567')).toBe('https://wa.me/573001234567');
      expect(componente.enlaceWhatsapp('+1 (555) 123-4567')).toBe('https://wa.me/15551234567');
    });

    it('devuelve null si hay menos de 7 dígitos o no hay teléfono', () => {
      const { componente } = crear();

      expect(componente.enlaceWhatsapp('12345')).toBeNull();
      expect(componente.enlaceWhatsapp('abc')).toBeNull();
      expect(componente.enlaceWhatsapp(null)).toBeNull();
      expect(componente.enlaceWhatsapp(undefined)).toBeNull();
    });
  });

  describe('filtro por estado', () => {
    it('filtra por el estado elegido y "Todas" muestra todo', () => {
      const { fixture, componente, el } = crear();
      const botones = () => el.querySelectorAll<HTMLButtonElement>('.btn-filtro');

      botones()[3].click(); // Cerradas
      fixture.detectChanges();
      expect(componente.filtroEstado).toBe(3);
      expect(componente.solicitudesFiltradas.map((s) => s.id)).toEqual([11]);
      expect(el.querySelectorAll('.solicitud-card').length).toBe(1);
      expect(botones()[3].classList).toContain('active');

      botones()[0].click();
      fixture.detectChanges();
      expect(componente.solicitudesFiltradas.length).toBe(3);
      expect(botones()[0].classList).toContain('active');
    });

    it('si ninguna solicitud tiene ese estado muestra el mensaje de vacío', () => {
      const { fixture, componente, el } = crear();

      componente.filtrarPorEstado(2);
      componente.listaSolicitudes = componente.listaSolicitudes.filter((s) => s.id !== 12);
      fixture.detectChanges();

      expect(el.querySelector('.empty-state')?.textContent).toContain('con este filtro');
    });
  });

  describe('cambiar estado', () => {
    it('envía el nuevo estado junto con las observaciones y recarga', () => {
      const { el } = crear();

      el.querySelectorAll('.solicitud-card')[0].querySelectorAll<HTMLButtonElement>('.btn-estado')[1].click(); // En gestión
      const peticion = http.expectOne((r) => r.method === 'PATCH' && r.url === `${SOLICITUDES}/10/atender`);
      expect(peticion.request.body).toEqual({ estadoId: 2, observacionesInternas: 'Llamar el lunes' });
      peticion.flush({ id: 10 });
      http.expectOne(SOLICITUDES).flush([]);

      expect(avisos().some((t) => t.type === 'success' && t.message === 'Estado de la solicitud actualizado')).toBe(true);
    });

    it('si falla avisa del error y no recarga', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      componente.cambiarEstado(componente.listaSolicitudes[0], 3);
      http.expectOne((r) => r.method === 'PATCH').flush(null, { status: 500, statusText: 'Error' });

      expect(avisos().some((t) => t.type === 'error' && t.message === 'Error al actualizar el estado')).toBe(true);
    });
  });

  describe('notas internas', () => {
    it('"+ Nota Interna" abre el modal con la nota actual y "Cancelar" lo cierra', () => {
      const { fixture, componente, el } = crear();

      el.querySelectorAll('.solicitud-card')[0].querySelector<HTMLButtonElement>('.btn-observacion')!.click();
      fixture.detectChanges();

      expect(el.querySelector('.modal-content')?.textContent).toContain('María Rojas');
      expect(componente.observacionTemporal).toBe('Llamar el lunes');

      el.querySelector<HTMLButtonElement>('.btn-cancelar')!.click();
      fixture.detectChanges();
      expect(el.querySelector('.modal-overlay')).toBeNull();
      expect(componente.solicitudSeleccionada).toBeNull();
    });

    it('una solicitud sin nota abre el modal con el cuadro vacío', () => {
      const { componente } = crear();

      componente.abrirModalNotas(componente.listaSolicitudes[1]);

      expect(componente.observacionTemporal).toBe('');
    });

    it('guardar envía la nota con el estado actual, recarga y cierra el modal', () => {
      const { fixture, componente } = crear();
      componente.abrirModalNotas(componente.listaSolicitudes[1]);
      componente.observacionTemporal = 'Cliente satisfecho';
      fixture.detectChanges();

      componente.guardarObservacion();
      const peticion = http.expectOne((r) => r.method === 'PATCH' && r.url === `${SOLICITUDES}/11/atender`);
      expect(peticion.request.body).toEqual({ estadoId: 3, observacionesInternas: 'Cliente satisfecho' });
      peticion.flush({ id: 11 });
      http.expectOne(SOLICITUDES).flush([]);

      expect(componente.mostrarModalNotas).toBe(false);
      expect(avisos().some((t) => t.message === 'Observación guardada correctamente')).toBe(true);
    });

    it('el botón "Guardar Nota" del modal dispara el guardado', () => {
      const { fixture, componente, el } = crear();
      componente.abrirModalNotas(componente.listaSolicitudes[0]);
      fixture.detectChanges();

      el.querySelector<HTMLButtonElement>('.btn-guardar')!.click();

      http.expectOne((r) => r.method === 'PATCH').flush({ id: 10 });
      http.expectOne(SOLICITUDES).flush([]);
    });

    it('si falla el guardado avisa y deja el modal abierto', () => {
      const { componente } = crear();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      componente.abrirModalNotas(componente.listaSolicitudes[0]);

      componente.guardarObservacion();
      http.expectOne((r) => r.method === 'PATCH').flush(null, { status: 500, statusText: 'Error' });

      expect(componente.mostrarModalNotas).toBe(true);
      expect(avisos().some((t) => t.message === 'Error al guardar la observación')).toBe(true);
    });

    it('sin solicitud seleccionada no envía nada', () => {
      const { componente } = crear();

      componente.guardarObservacion();

      http.expectNone((r) => r.method === 'PATCH');
    });
  });
});
