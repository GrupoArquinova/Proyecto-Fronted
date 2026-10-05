import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Multimedia } from '../models/multimedia.models';
import { ZonaComun } from '../models/zona-comun.models';
import { CasaModelo } from '../models/casa-modelo.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MultimediaService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/multimedia`;
  private zonasComunesUrl = `${environment.apiUrl}/zonas-comunes`;
  private casasModeloUrl = `${environment.apiUrl}/casas-modelo`;

  obtenerMultimedia(): Observable<Multimedia[]> {
    return this.http.get<Multimedia[]>(this.apiUrl);
  }

  /** Recursos publicados de un proyecto, lote, zona común o casa modelo (sitio público). */
  listarPublicadosPorEntidad(
    tipoEntidad: 'proyecto' | 'lote' | 'zonaComun' | 'casaModelo',
    entidadId: number
  ): Observable<Multimedia[]> {
    return this.http.get<Multimedia[]>(`${this.apiUrl}/${tipoEntidad}/${entidadId}`, {
      params: { soloPublicados: true }
    });
  }

  obtenerMultimediaPorId(id: number): Observable<Multimedia> {
    return this.http.get<Multimedia>(`${this.apiUrl}/${id}`);
  }

  crearMultimedia(multimedia: Partial<Multimedia>): Observable<Multimedia> {
    return this.http.post<Multimedia>(this.apiUrl, multimedia);
  }

  actualizarMultimedia(id: number, multimedia: Partial<Multimedia>): Observable<Multimedia> {
    return this.http.put<Multimedia>(`${this.apiUrl}/${id}`, multimedia);
  }

  eliminarMultimedia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Zonas comunes de UN proyecto específico (no existe endpoint "listar todas") */
  obtenerZonasComunesPorProyecto(proyectoId: number): Observable<ZonaComun[]> {
    return this.http.get<ZonaComun[]>(`${this.zonasComunesUrl}/proyecto/${proyectoId}`);
  }

  /** Casas modelo de UN proyecto específico (no existe endpoint "listar todas") */
  obtenerCasasModeloPorProyecto(proyectoId: number): Observable<CasaModelo[]> {
    return this.http.get<CasaModelo[]>(`${this.casasModeloUrl}/proyecto/${proyectoId}`);
  }
}