import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AsistenteProyectoService } from './asistente-proyecto.service';

const CLAVE = 'asistente_proyecto_borrador';

describe('AsistenteProyectoService', () => {
  let service: AsistenteProyectoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(CLAVE);
    TestBed.configureTestingModule({
      providers: [AsistenteProyectoService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AsistenteProyectoService);
    http = TestBed.inject(HttpTestingController);
  });

  it('empieza en el paso 1 y sin proyecto', () => {
    expect(service.paso()).toBe(1);
    expect(service.tieneProyecto()).toBe(false);
  });

  it('no deja saltar a un paso al que todavia no se llega', () => {
    service.fijarProyecto({ id: 5, empresaId: 1, nombre: 'Los Andes' });
    service.irAPaso(4);
    expect(service.paso()).toBe(1);
  });

  it('avanza, retrocede y permite volver a pasos ya completados', () => {
    service.fijarProyecto({ id: 5, empresaId: 1, nombre: 'Los Andes' });
    service.siguiente();
    service.siguiente();
    expect(service.paso()).toBe(3);
    expect(service.pasoMaximo()).toBe(3);

    service.irAPaso(1);
    expect(service.paso()).toBe(1);
    expect(service.pasoMaximo()).toBe(3);
  });

  it('no pasa del ultimo paso ni baja del primero', () => {
    service.fijarProyecto({ id: 5, empresaId: 1, nombre: 'Los Andes' });
    for (let i = 0; i < 10; i++) service.siguiente();
    expect(service.paso()).toBe(6);
    for (let i = 0; i < 10; i++) service.anterior();
    expect(service.paso()).toBe(1);
  });

  it('guarda el borrador al fijar el proyecto y lo borra al reiniciar', () => {
    service.fijarProyecto({ id: 5, empresaId: 1, nombre: 'Los Andes' });
    service.siguiente();
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual({ proyectoId: 5, paso: 2 });

    service.reiniciar();
    expect(localStorage.getItem(CLAVE)).toBeNull();
    expect(service.tieneProyecto()).toBe(false);
    expect(service.paso()).toBe(1);
  });

  it('sin borrador no hay nada que retomar', () => {
    let hay: boolean | undefined;
    service.retomarBorrador().subscribe(v => (hay = v));
    expect(hay).toBe(false);
  });

  it('retoma el borrador recargando proyecto, ubicacion y etapas del servidor', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ proyectoId: 7, paso: 3 }));
    let hay: boolean | undefined;
    service.retomarBorrador().subscribe(v => (hay = v));

    http.expectOne(r => r.url.endsWith('/proyectos/7')).flush({ id: 7, empresaId: 1, nombre: 'Casas Circacias' });
    http.expectOne(r => r.url.endsWith('/ubicaciones/proyecto/7')).flush(null, { status: 404, statusText: 'Not Found' });
    http.expectOne(r => r.url.endsWith('/etapas/proyecto/7')).flush([{ id: 1, proyectoId: 7, nombre: 'Etapa 1', orden: 1 }]);

    expect(hay).toBe(true);
    expect(service.proyecto()?.nombre).toBe('Casas Circacias');
    expect(service.ubicacion()).toBeNull();
    expect(service.etapas().length).toBe(1);
    expect(service.paso()).toBe(3);
  });

  it('ignora un borrador corrupto', () => {
    localStorage.setItem(CLAVE, '{no es json');
    let hay: boolean | undefined;
    service.retomarBorrador().subscribe(v => (hay = v));
    expect(hay).toBe(false);
  });
});
