import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Etapa, EtapaRequest, ProyectoRef } from '../models/etapa.models';

@Injectable({
  providedIn: 'root'
})
export class EtapaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/etapas';
  private proyectosUrl = 'http://localhost:8080/api/proyectos';

  obtenerEtapas(): Observable<Etapa[]> {
    return this.http.get<Etapa[]>(this.apiUrl);
  }

  obtenerProyectos(): Observable<ProyectoRef[]> {
    return this.http.get<ProyectoRef[]>(this.proyectosUrl);
  }

  crearEtapa(etapa: EtapaRequest): Observable<Etapa> {
    return this.http.post<Etapa>(this.apiUrl, etapa);
  }

  actualizarEtapa(id: number, etapa: EtapaRequest): Observable<Etapa> {
    return this.http.put<Etapa>(`${this.apiUrl}/${id}`, etapa);
  }

  eliminarEtapa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}