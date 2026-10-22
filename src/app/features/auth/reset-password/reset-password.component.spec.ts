import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ResetPasswordComponent } from './reset-password.component';

function crear(token: string | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } },
    ],
  });
  const fixture = TestBed.createComponent(ResetPasswordComponent);
  fixture.detectChanges();
  return fixture;
}

describe('ResetPasswordComponent', () => {
  it('con el enlace del correo toma el token y no se lo pide a la persona', () => {
    const fixture = crear('abc-123');

    expect(fixture.componentInstance.token).toBe('abc-123');
    expect(fixture.componentInstance.llegoPorEnlace).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('#token')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Elige tu nueva contraseña');
  });

  it('sin enlace pide el código a mano', () => {
    const fixture = crear(null);

    expect(fixture.componentInstance.llegoPorEnlace).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('#token')).not.toBeNull();
  });

  it('si no hay conexión con el servidor no dice que la contraseña se actualizó', () => {
    const fixture = crear('abc-123');
    const http = TestBed.inject(HttpTestingController);
    const componente = fixture.componentInstance;
    componente.nuevaPassword = 'Clave-Segura1!';

    componente.onSubmit();
    http.expectOne(r => r.url.endsWith('/reset-password')).error(new ProgressEvent('error'));

    expect(componente.successMessage()).toBe('');
    expect(componente.errorMessage()).toContain('No pudimos conectar con el servidor');
  });
});
