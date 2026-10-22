import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PasoContenidoComponent } from './paso-contenido.component';
import { BloqueZonasComponent } from './bloques/bloque-zonas.component';
import { BloqueCasasComponent } from './bloques/bloque-casas.component';
import { BloqueRecursosComponent } from './bloques/bloque-recursos.component';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { By } from '@angular/platform-browser';

describe('PasoContenidoComponent', () => {
  let http: HttpTestingController;

  function crear() {
    TestBed.configureTestingModule({
      imports: [PasoContenidoComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    asistente.paso.set(5);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PasoContenidoComponent);
    fixture.detectChanges();
    return { fixture, asistente, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('muestra el título y los tres bloques: amenidades, tipologías y recursos', () => {
    const { el, fixture } = crear();

    expect(el.querySelector('h2')!.textContent).toContain('Amenidades, tipologías y recursos');
    expect(fixture.debugElement.query(By.directive(BloqueZonasComponent))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(BloqueCasasComponent))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(BloqueRecursosComponent))).not.toBeNull();
  });

  it('Atrás vuelve al paso de lotes y Continuar pasa a revisar', () => {
    const { el, asistente } = crear();
    const botones = Array.from(el.querySelectorAll('.acciones button')) as HTMLButtonElement[];

    botones.find(b => b.textContent!.includes('Continuar'))!.click();
    expect(asistente.paso()).toBe(6);
    botones.find(b => b.textContent!.includes('Atrás'))!.click();
    expect(asistente.paso()).toBe(5);
  });
});
