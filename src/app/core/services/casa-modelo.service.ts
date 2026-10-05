import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CasaModelo } from '../models/casa-modelo.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CasaModeloService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/casas-modelo`;

  listar(): Observable<CasaModelo[]> {
    return this.http.get<CasaModelo[]>(this.apiUrl);
  }

  listarPorProyecto(proyectoId: number): Observable<CasaModelo[]> {
    return this.http.get<CasaModelo[]>(`${this.apiUrl}/proyecto/${proyectoId}`);
  }

  obtenerPorId(id: number): Observable<CasaModelo> {
    return this.http.get<CasaModelo>(`${this.apiUrl}/${id}`);
  }

  crear(casa: CasaModelo): Observable<CasaModelo> {
    return this.http.post<CasaModelo>(this.apiUrl, casa);
  }

  actualizar(id: number, casa: CasaModelo): Observable<CasaModelo> {
    return this.http.put<CasaModelo>(`${this.apiUrl}/${id}`, casa);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}