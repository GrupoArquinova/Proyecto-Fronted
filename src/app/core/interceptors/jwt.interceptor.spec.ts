import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

/** Un JWT de mentira que vence dentro de `segundos`. */
function token(segundos: number, marca = ''): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + segundos, marca })}.firma`;
}

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { showInfo: vi.fn() } }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('agrega el token a las peticiones del panel', () => {
    const vigente = token(3000);
    localStorage.setItem('jwt_token', vigente);

    http.get(`${environment.apiUrl}/lotes`).subscribe();

    expect(backend.expectOne(`${environment.apiUrl}/lotes`).request.headers.get('Authorization')).toBe(`Bearer ${vigente}`);
  });

  it('no agrega token a las rutas públicas ni a Cloudinary', () => {
    localStorage.setItem('jwt_token', token(3000));

    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();
    http.post('https://api.cloudinary.com/v1_1/x/auto/upload', {}).subscribe();

    expect(backend.expectOne(`${environment.apiUrl}/auth/login`).request.headers.has('Authorization')).toBe(false);
    expect(backend.expectOne('https://api.cloudinary.com/v1_1/x/auto/upload').request.headers.has('Authorization')).toBe(false);
  });

  it('si la sesión está por vencer, la renueva y envía la petición con el token nuevo', () => {
    localStorage.setItem('jwt_token', token(300, 'viejo'));
    const nuevo = token(3600, 'nuevo');

    http.get(`${environment.apiUrl}/lotes`).subscribe();

    // Primero la renovación (con el token viejo)...
    const renovar = backend.expectOne(`${environment.apiUrl}/auth/renovar`);
    expect(renovar.request.method).toBe('POST');
    renovar.flush({ token: nuevo });

    // ...y después la petición original, ya con el token nuevo
    const lotes = backend.expectOne(`${environment.apiUrl}/lotes`);
    expect(lotes.request.headers.get('Authorization')).toBe(`Bearer ${nuevo}`);
    lotes.flush([]);
  });

  it('dos peticiones simultáneas con la sesión por vencer renuevan una sola vez', () => {
    localStorage.setItem('jwt_token', token(300, 'viejo'));
    const nuevo = token(3600, 'nuevo');

    http.get(`${environment.apiUrl}/lotes`).subscribe();
    http.get(`${environment.apiUrl}/etapas`).subscribe();

    backend.expectOne(`${environment.apiUrl}/auth/renovar`).flush({ token: nuevo });
    const lotes = backend.expectOne(`${environment.apiUrl}/lotes`);
    const etapas = backend.expectOne(`${environment.apiUrl}/etapas`);
    expect(lotes.request.headers.get('Authorization')).toBe(`Bearer ${nuevo}`);
    expect(etapas.request.headers.get('Authorization')).toBe(`Bearer ${nuevo}`);
    lotes.flush([]);
    etapas.flush([]);
  });

  it('si la renovación falla, la petición sigue con el token actual', () => {
    const actual = token(300, 'actual');
    localStorage.setItem('jwt_token', actual);

    http.get(`${environment.apiUrl}/lotes`).subscribe();

    backend.expectOne(`${environment.apiUrl}/auth/renovar`).error(new ProgressEvent('error'));
    const lotes = backend.expectOne(`${environment.apiUrl}/lotes`);
    expect(lotes.request.headers.get('Authorization')).toBe(`Bearer ${actual}`);
    lotes.flush([]);
  });

  it('un 401 en el panel cierra la sesión y manda al login', () => {
    localStorage.setItem('jwt_token', token(3000));
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    http.get(`${environment.apiUrl}/lotes`).subscribe({ error: () => undefined });
    backend.expectOne(`${environment.apiUrl}/lotes`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).getToken()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
