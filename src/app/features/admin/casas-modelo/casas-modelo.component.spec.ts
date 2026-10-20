import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CasasModeloComponent } from './casas-modelo.component';
import { environment } from '../../../../environments/environment';

describe('CasasModeloComponent · crear tipología con renders y planos', () => {
  function crear() {
    TestBed.configureTestingModule({
      imports: [CasasModeloComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CasasModeloComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/casas-modelo`).flush([]);
    http.expectOne(`${environment.apiUrl}/proyectos`).flush([{ id: 1, nombre: 'El Encanto' }]);
    return { fixture, http, componente: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('al crear una tipología nueva ya se pueden agregar renders y planos', () => {
    const { fixture, componente, el } = crear();
    componente.abrirModalCrear();
    fixture.detectChanges();

    expect(el.textContent).toContain('Imágenes de la tipología (renders)');
    expect(el.textContent).toContain('Planos');
    expect(el.textContent).not.toContain('Guarda la tipología para poder subir');
  });

  it('al guardar, los renders y planos subidos quedan asociados a la tipología creada', () => {
    const { fixture, http, componente } = crear();
    componente.abrirModalCrear();
    componente.casaActual.nombre = 'Casa Tipo A';
    componente.imagenesNuevas = [{ url: 'render.jpg', nombre: 'render.jpg' }];
    componente.planosNuevos = [{ url: 'plano.pdf', nombre: 'plano.pdf' }];
    fixture.detectChanges();

    componente.guardarCasa();
    http.expectOne(`${environment.apiUrl}/casas-modelo`).flush({ id: 55, nombre: 'Casa Tipo A' });

    const render = http.expectOne(`${environment.apiUrl}/multimedia`);
    expect(render.request.body).toMatchObject({ casaModeloId: 55, tipo: 'IMAGEN', url: 'render.jpg', portada: true });
    render.flush({ id: 1 });
    const plano = http.expectOne(`${environment.apiUrl}/multimedia`);
    expect(plano.request.body).toMatchObject({ casaModeloId: 55, tipo: 'PLANO', url: 'plano.pdf' });
    plano.flush({ id: 2 });

    http.expectOne(`${environment.apiUrl}/casas-modelo`).flush([]); // recarga del listado
    expect(componente.modalAbierto).toBe(false);
    expect(componente.guardando).toBe(false);
  });
});
