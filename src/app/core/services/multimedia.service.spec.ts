import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MultimediaService } from './multimedia.service';
import { environment } from '../../../environments/environment';

describe('MultimediaService · archivos de una tipología', () => {
  let servicio: MultimediaService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/multimedia`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(MultimediaService);
    http = TestBed.inject(HttpTestingController);
  });

  it('el primer render es la portada y los demás siguen en orden; los planos nunca son portada', () => {
    const render1 = servicio.recursoDeTipologia(7, 'IMAGEN', { url: 'a.jpg', nombre: 'Fachada.jpg' }, 1);
    const render2 = servicio.recursoDeTipologia(7, 'IMAGEN', { url: 'b.jpg', nombre: 'Sala.png' }, 2);
    const plano = servicio.recursoDeTipologia(7, 'PLANO', { url: 'p.pdf', nombre: 'Planta 1.pdf' }, 1);

    expect(render1).toMatchObject({ casaModeloId: 7, tipo: 'IMAGEN', titulo: 'Fachada', orden: 1, portada: true, publicado: true });
    expect(render2).toMatchObject({ titulo: 'Sala', orden: 2, portada: false });
    expect(plano).toMatchObject({ tipo: 'PLANO', titulo: 'Planta 1', orden: 1, portada: false });
  });

  it('guarda renders y planos de la tipología recién creada, uno tras otro', () => {
    let fallidos = -1;
    servicio.guardarArchivosDeTipologia(9, [{ url: 'a.jpg', nombre: 'a.jpg' }, { url: 'b.jpg', nombre: 'b.jpg' }], [{ url: 'p.png', nombre: 'p.png' }])
      .subscribe(n => (fallidos = n));

    for (const esperado of ['a.jpg', 'b.jpg', 'p.png']) {
      const peticion = http.expectOne(url);
      expect(peticion.request.body.url).toBe(esperado);
      expect(peticion.request.body.casaModeloId).toBe(9);
      peticion.flush({ id: 1 });
    }
    expect(fallidos).toBe(0);
  });

  it('si un archivo falla sigue con los demás y avisa cuántos fallaron', () => {
    let fallidos = -1;
    servicio.guardarArchivosDeTipologia(9, [{ url: 'a.jpg', nombre: 'a.jpg' }, { url: 'b.jpg', nombre: 'b.jpg' }], [])
      .subscribe(n => (fallidos = n));

    http.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
    http.expectOne(url).flush({ id: 2 });
    expect(fallidos).toBe(1);
  });

  it('sin archivos no llama al servidor', () => {
    let fallidos = -1;
    servicio.guardarArchivosDeTipologia(9, [], []).subscribe(n => (fallidos = n));
    http.expectNone(url);
    expect(fallidos).toBe(0);
  });
});
