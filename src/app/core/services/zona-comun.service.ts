import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ZonaComun } from '../models/zona-comun.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ZonaComunService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zonas-comunes`;

  listarPorProyecto(proyectoId: number): Observable<ZonaComun[]> {
    return this.http.get<ZonaComun[]>(`${this.apiUrl}/proyecto/${proyectoId}`);
  }

  /** Zonas comunes publicadas y activas de un proyecto, con su galería (sitio público). */
  listarPublicasPorProyecto(proyectoId: number): Observable<ZonaComun[]> {
    return this.http.get<ZonaComun[]>(`${this.apiUrl}/proyecto/${proyectoId}/publicas`);
  }

  crear(zona: ZonaComun): Observable<ZonaComun> {
    return this.http.post<ZonaComun>(this.apiUrl, zona);
  }

  actualizar(id: number, zona: ZonaComun): Observable<ZonaComun> {
    return this.http.put<ZonaComun>(`${this.apiUrl}/${id}`, zona);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}