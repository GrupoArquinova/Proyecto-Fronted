import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UsuarioService } from './usuario.service';
import { Usuario } from '../models/usuario.models';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/usuarios`;
const admin: Usuario = { rolId: 1, nombreCompleto: 'Ana', correo: 'ana@correo.com', password: 'Segura#2026', activo: true };

describe('UsuarioService', () => {
  let servicio: UsuarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(UsuarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar pide todos los usuarios con GET', () => {
    let recibido: Usuario[] = [];
    servicio.listar().subscribe((r) => (recibido = r));

    const peticion = http.expectOne(URL);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([{ ...admin, id: 1 }]);

    expect(recibido.length).toBe(1);
  });

  it('crear envía el usuario con POST', () => {
    servicio.crear(admin).subscribe();

    const peticion = http.expectOne(URL);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(admin);
    peticion.flush({ ...admin, id: 2 });
  });

  it('actualizar envía los cambios con PUT a la URL del usuario', () => {
    servicio.actualizar(7, admin).subscribe();

    const peticion = http.expectOne(`${URL}/7`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(admin);
    peticion.flush({ ...admin, id: 7 });
  });

  it('eliminar usa DELETE sobre la URL del usuario', () => {
    servicio.eliminar(7).subscribe();

    const peticion = http.expectOne(`${URL}/7`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });
});
