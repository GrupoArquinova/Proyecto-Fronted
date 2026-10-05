import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Etapa, EtapaRequest } from '../models/etapa.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EtapaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/etapas`;

  obtenerEtapas(): Observable<Etapa[]> {
    return this.http.get<Etapa[]>(this.apiUrl);
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