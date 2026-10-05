import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Multimedia } from '../models/multimedia.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MultimediaService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/multimedia`;
  private proyectosUrl = `${environment.apiUrl}/proyectos`;
  private lotesUrl = `${environment.apiUrl}/lotes`;
  private zonasComunesUrl = `${environment.apiUrl}/zonas-comunes`;
  private casasModeloUrl = `${environment.apiUrl}/casas-modelo`;

  obtenerMultimedia(): Observable<Multimedia[]> {
    return this.http.get<Multimedia[]>(this.apiUrl);
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

  obtenerProyectos(): Observable<any[]> {
    return this.http.get<any[]>(this.proyectosUrl);
  }

  obtenerLotes(): Observable<any[]> {
    return this.http.get<any[]>(this.lotesUrl);
  }

  /** Zonas comunes de UN proyecto específico (no existe endpoint "listar todas") */
  obtenerZonasComunesPorProyecto(proyectoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.zonasComunesUrl}/proyecto/${proyectoId}`);
  }

  /** Casas modelo de UN proyecto específico (no existe endpoint "listar todas") */
  obtenerCasasModeloPorProyecto(proyectoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.casasModeloUrl}/proyecto/${proyectoId}`);
  }
}