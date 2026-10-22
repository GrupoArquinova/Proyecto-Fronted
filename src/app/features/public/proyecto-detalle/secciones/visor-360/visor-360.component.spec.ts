import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { Visor360Component, PosicionPanorama } from './visor-360.component';

// Photo Sphere Viewer necesita WebGL: se reemplaza por dobles que dejan ver cómo lo usa el componente
const mocks = vi.hoisted(() => {
  const marcadores = { setMarkers: vi.fn(), addEventListener: vi.fn() };
  const visor = { destroy: vi.fn(), animate: vi.fn(), addEventListener: vi.fn(), getPlugin: vi.fn(() => marcadores) };
  const Viewer = vi.fn(function (opciones: Record<string, unknown>) { void opciones; return visor; });
  class MarkersPlugin {}
  return { marcadores, visor, Viewer, MarkersPlugin };
});
vi.mock('@photo-sphere-viewer/core', () => ({ Viewer: mocks.Viewer }));
vi.mock('@photo-sphere-viewer/markers-plugin', () => ({ MarkersPlugin: mocks.MarkersPlugin }));

const punto = (id: number, extra: Partial<Punto360> = {}): Punto360 =>
  ({ id, proyectoId: 7, escena: 'ENTORNO', etiqueta: `Lote ${id}`, loteId: id, yaw: 0.5 * id, pitch: -0.1 * id, ...extra });

function crear(entradas: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(Visor360Component);
  fixture.componentRef.setInput('url', 'https://img.test/360.jpg');
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, c: fixture.componentInstance };
}

/** Espera a que los imports dinámicos terminen y el visor quede creado. */
async function cargado(entradas: Record<string, unknown> = {}) {
  const r = crear(entradas);
  await vi.waitFor(() => expect(mocks.Viewer).toHaveBeenCalledTimes(1), { timeout: 5000 });
  return r;
}

const manejador = (lista: { mock: { calls: unknown[][] } }, tipo: string) =>
  lista.mock.calls.find(llamada => llamada[0] === tipo)?.[1] as (e: unknown) => void;

describe('Visor360Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('creación del visor', () => {
    it('crea el visor con la imagen, el contenedor, la barra reducida y el plugin de marcadores', async () => {
      const { el } = await cargado({ titulo: 'el entorno' });

      const opciones = mocks.Viewer.mock.calls[0][0] as Record<string, unknown>;
      expect(opciones['panorama']).toBe('https://img.test/360.jpg');
      expect(opciones['container']).toBe(el.querySelector('.visor-360'));
      expect(opciones['navbar']).toEqual(['zoom', 'move', 'fullscreen']);
      expect(opciones['loadingTxt']).toBe('Cargando recorrido...');
      expect(opciones['plugins']).toEqual([[mocks.MarkersPlugin, {}]]);
      expect(mocks.visor.getPlugin).toHaveBeenCalledWith(mocks.MarkersPlugin);
    });

    it('el contenedor describe el recorrido para lectores de pantalla', () => {
      const { el } = crear({ titulo: 'el entorno' });
      const contenedor = el.querySelector('.visor-360')!;
      expect(contenedor.getAttribute('role')).toBe('img');
      expect(contenedor.getAttribute('aria-label')).toBe('Recorrido 360: el entorno');
    });

    it('la clase "completo" del anfitrión sigue el input', () => {
      const { fixture, el } = crear({ completo: true });
      expect(el.classList.contains('completo')).toBe(true);
      fixture.componentRef.setInput('completo', false);
      fixture.detectChanges();
      expect(el.classList.contains('completo')).toBe(false);
    });

    it('si el visor no se puede iniciar registra el error y no rompe la página', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mocks.Viewer.mockImplementationOnce(function () { throw new Error('sin WebGL'); });

      crear();

      await vi.waitFor(() => expect(consola).toHaveBeenCalledWith('No se pudo iniciar el visor 360:', expect.any(Error)), { timeout: 5000 });
    });
  });

  describe('marcadores desde los puntos', () => {
    it('dibuja un marcador por punto con su posición, HTML, ancla y el id del punto', async () => {
      await cargado({ puntos: [punto(1, { loteAreaM2: 800 }), punto(2)] });

      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista.length).toBe(2);
      expect(lista[0]).toMatchObject({
        id: 'punto-1',
        position: { yaw: 0.5, pitch: -0.1 },
        anchor: 'bottom center',
        data: { puntoId: 1 }
      });
      expect(lista[0]['html']).toContain('<div class="pin-360"><strong>Lote 1</strong><small>800 m²</small></div>');
      expect(lista[1]['html']).toBe('<div class="pin-360"><strong>Lote 2</strong></div>');
    });

    it('un lugar cercano (sin lote, etapa ni zona) se dibuja como rótulo', async () => {
      await cargado({ puntos: [punto(1, { loteId: null, etiqueta: 'Colegio' })] });
      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista[0]['html']).toBe('<div class="pin-lugar"><span>Colegio</span></div>');
    });

    it('escapa el texto del administrador para que no inyecte HTML', async () => {
      await cargado({ puntos: [punto(1, { etiqueta: '<img src=x onerror=alert(1)>' })] });
      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista[0]['html']).not.toContain('<img');
      expect(lista[0]['html']).toContain('&lt;img');
    });

    it('omite los puntos sin posición angular y acepta el ángulo cero', async () => {
      await cargado({ puntos: [punto(1, { yaw: null }), punto(2, { pitch: undefined }), punto(3, { yaw: 0, pitch: 0 })] });
      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista.map(m => m['id'])).toEqual(['punto-3']);
    });

    it('convierte a número ángulos que lleguen como texto', async () => {
      await cargado({ puntos: [punto(1, { yaw: '1.5' as never, pitch: '-0.25' as never })] });
      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista[0]['position']).toEqual({ yaw: 1.5, pitch: -0.25 });
    });

    it('sin puntos deja la lista vacía', async () => {
      await cargado();
      expect(mocks.marcadores.setMarkers).toHaveBeenLastCalledWith([]);
    });

    it('vuelve a dibujar los marcadores cuando cambian los puntos', async () => {
      const { fixture } = await cargado({ puntos: [punto(1)] });
      fixture.componentRef.setInput('puntos', [punto(1), punto(2)]);
      fixture.detectChanges();

      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista.map(m => m['id'])).toEqual(['punto-1', 'punto-2']);
    });

    it('antes de que el visor esté listo no intenta dibujar y al cargar dibuja lo último recibido', async () => {
      const { fixture } = crear({ puntos: [punto(1)] });
      fixture.componentRef.setInput('puntos', [punto(1), punto(2)]);
      fixture.detectChanges();
      expect(mocks.marcadores.setMarkers).not.toHaveBeenCalled();

      await vi.waitFor(() => expect(mocks.marcadores.setMarkers).toHaveBeenCalledTimes(1), { timeout: 5000 });
      const lista = mocks.marcadores.setMarkers.mock.calls[0][0] as Record<string, unknown>[];
      expect(lista.map(m => m['id'])).toEqual(['punto-1', 'punto-2']);
    });
  });

  describe('marca pendiente (editor)', () => {
    it('agrega la marca amarilla al final con su posición', async () => {
      await cargado({ puntos: [punto(1)], pendiente: { yaw: 1, pitch: 0.2 } });
      const lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista.map(m => m['id'])).toEqual(['punto-1', 'pendiente']);
      expect(lista[1]).toMatchObject({
        position: { yaw: 1, pitch: 0.2 },
        html: '<div class="pin-360-pendiente"></div>',
        anchor: 'center center'
      });
    });

    it('al cambiar o quitar la marca se redibuja', async () => {
      const { fixture } = await cargado({ pendiente: { yaw: 1, pitch: 0.2 } });
      fixture.componentRef.setInput('pendiente', { yaw: 2, pitch: 0.4 });
      fixture.detectChanges();
      let lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista[0]['position']).toEqual({ yaw: 2, pitch: 0.4 });

      fixture.componentRef.setInput('pendiente', null);
      fixture.detectChanges();
      lista = mocks.marcadores.setMarkers.mock.calls.at(-1)![0] as Record<string, unknown>[];
      expect(lista).toEqual([]);
    });
  });

  describe('eventos del visor', () => {
    it('elegir un marcador emite el punto completo', async () => {
      const puntos = [punto(1), punto(2)];
      const { c } = await cargado({ puntos });
      const elegidos: Punto360[] = [];
      c.puntoElegido.subscribe(p => elegidos.push(p));

      manejador(mocks.marcadores.addEventListener, 'select-marker')({ marker: { data: { puntoId: 2 } } });

      expect(elegidos).toEqual([puntos[1]]);
    });

    it('elegir un marcador desconocido, sin datos (la marca pendiente) o de un punto que ya no está no emite nada', async () => {
      const { c } = await cargado({ puntos: [punto(1)] });
      const elegidos: Punto360[] = [];
      c.puntoElegido.subscribe(p => elegidos.push(p));
      const seleccionar = manejador(mocks.marcadores.addEventListener, 'select-marker');

      seleccionar({ marker: { data: { puntoId: 99 } } });
      seleccionar({ marker: {} });
      seleccionar({ marker: { data: {} } });

      expect(elegidos).toEqual([]);
    });

    it('usa siempre los puntos más recientes al elegir', async () => {
      const { c, fixture } = await cargado({ puntos: [punto(1)] });
      fixture.componentRef.setInput('puntos', [punto(5)]);
      fixture.detectChanges();
      const elegidos: Punto360[] = [];
      c.puntoElegido.subscribe(p => elegidos.push(p));

      manejador(mocks.marcadores.addEventListener, 'select-marker')({ marker: { data: { puntoId: 5 } } });

      expect(elegidos.map(p => p.id)).toEqual([5]);
    });

    it('un clic en la imagen emite la posición en yaw y pitch', async () => {
      const { c } = await cargado();
      const posiciones: PosicionPanorama[] = [];
      c.clicEnImagen.subscribe(p => posiciones.push(p));

      manejador(mocks.visor.addEventListener, 'click')({ data: { yaw: 1.2, pitch: -0.3, rightclick: false } });

      expect(posiciones).toEqual([{ yaw: 1.2, pitch: -0.3 }]);
    });

    it('el clic derecho se ignora', async () => {
      const { c } = await cargado();
      const posiciones: PosicionPanorama[] = [];
      c.clicEnImagen.subscribe(p => posiciones.push(p));

      manejador(mocks.visor.addEventListener, 'click')({ data: { yaw: 1.2, pitch: -0.3, rightclick: true } });

      expect(posiciones).toEqual([]);
    });
  });

  describe('irA', () => {
    it('gira la vista hasta la posición a 12 rpm', async () => {
      const { c } = await cargado();
      c.irA({ yaw: 0.8, pitch: 0.1 });
      expect(mocks.visor.animate).toHaveBeenCalledWith({ yaw: 0.8, pitch: 0.1, speed: '12rpm' });
    });

    it('si el visor todavía no está listo no hace nada', () => {
      const { c } = crear();
      expect(() => c.irA({ yaw: 0.8, pitch: 0.1 })).not.toThrow();
      expect(mocks.visor.animate).not.toHaveBeenCalled();
    });
  });

  describe('pista 360°', () => {
    it('se muestra al principio con la etiqueta 360°', () => {
      const { el } = crear();
      expect(el.querySelector('.pista-360')).not.toBeNull();
      expect(el.querySelector('.etiqueta-360')?.textContent).toBe('360°');
    });

    it('no se muestra si pista360 es falso', () => {
      const { el } = crear({ pista360: false });
      expect(el.querySelector('.pista-360')).toBeNull();
    });

    it.each(['pointerdown', 'touchstart', 'wheel'])('se quita al recibir %s sobre la imagen', evento => {
      const { fixture, el, c } = crear();
      el.dispatchEvent(new Event(evento));
      fixture.detectChanges();
      expect(c.pista()).toBe(false);
      expect(el.querySelector('.pista-360')).toBeNull();
    });

    it('no vuelve a aparecer después de quitarse', () => {
      const { fixture, el } = crear();
      el.dispatchEvent(new Event('pointerdown'));
      fixture.componentRef.setInput('pista360', false);
      fixture.componentRef.setInput('pista360', true);
      fixture.detectChanges();
      expect(el.querySelector('.pista-360')).toBeNull();
    });
  });

  describe('destrucción', () => {
    it('al destruir el componente destruye el visor', async () => {
      const { fixture } = await cargado();
      fixture.destroy();
      expect(mocks.visor.destroy).toHaveBeenCalledTimes(1);
    });

    it('si se destruye antes de terminar la carga, nunca crea el visor', async () => {
      const { fixture } = crear();
      fixture.destroy();
      await new Promise(resolver => setTimeout(resolver, 20));
      expect(mocks.Viewer).not.toHaveBeenCalled();
      expect(mocks.visor.destroy).not.toHaveBeenCalled();
    });

    it('después de destruir, irA y los cambios de puntos no tocan el visor', async () => {
      const { fixture, c } = await cargado({ puntos: [punto(1)] });
      fixture.destroy();
      mocks.visor.animate.mockClear();
      c.irA({ yaw: 1, pitch: 1 });
      expect(mocks.visor.animate).not.toHaveBeenCalled();
    });
  });
});
