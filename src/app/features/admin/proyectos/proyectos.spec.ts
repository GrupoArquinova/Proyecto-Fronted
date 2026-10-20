import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ProyectosComponent } from './proyectos';

describe('ProyectosComponent', () => {
  let component: ProyectosComponent;
  let fixture: ComponentFixture<ProyectosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProyectosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(ProyectosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('la imagen del proyecto es una imagen normal: sin campo ni visor 360°', () => {
    component.abrirModalCrear();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Imagen del proyecto');
    expect(el.textContent).not.toContain('360');

    component.ampliarImagen('https://res.cloudinary.com/demo/foto.jpg');
    fixture.detectChanges();
    expect(el.querySelector('img.imagen-ampliada')).not.toBeNull();
    expect(el.querySelector('#panorama-viewer')).toBeNull();
    expect(el.textContent).not.toContain('360');

    component.cerrarImagen();
    fixture.detectChanges();
    expect(el.querySelector('img.imagen-ampliada')).toBeNull();
  });
});
