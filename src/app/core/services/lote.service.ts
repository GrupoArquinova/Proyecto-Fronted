import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { Lote, Etapa } from '../models/lote.models';

export interface Proyecto {
    id: number;
    nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/lotes`;
  private proyectosUrl = `${environment.apiUrl}/proyectos`;

  obtenerLotes(): Observable<Lote[]> {
    return this.http.get<Lote[]>(this.apiUrl);
  }

  obtenerProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.proyectosUrl);
  }

  cambiarEstado(loteId: number, estadoId: number): Observable<Lote> {
    return this.http.patch<Lote>(`${this.apiUrl}/${loteId}/estado`, { estadoId });
  }

  toggleActivo(loteId: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${loteId}/activo`, { activo });
  }

  crearLote(lote: Partial<Lote>): Observable<Lote> {
    return this.http.post<Lote>(this.apiUrl, lote);
  }

  actualizarLote(id: number, lote: Partial<Lote>): Observable<Lote> {
    return this.http.put<Lote>(`${this.apiUrl}/${id}`, lote);
  }

  obtenerEtapas(): Observable<Etapa[]> {
    return this.http.get<Etapa[]>(`${environment.apiUrl}/etapas`);
  }
}