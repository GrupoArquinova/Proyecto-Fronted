import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Rol tal como lo entrega GET /api/roles (nombre sin el prefijo ROLE_). */
export interface RolApi {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class RolService {
  private http = inject(HttpClient);

  /** Lista de roles (solo administrador). Los ids vienen del backend: no se suponen. */
  listar(): Observable<RolApi[]> {
    return this.http.get<RolApi[]>(`${environment.apiUrl}/roles`);
  }
}
