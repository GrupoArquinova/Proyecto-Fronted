import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EscenaPunto, Punto360, Punto360Request } from '../models/punto-360.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Punto360Service {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/puntos-360`;

  /** Lectura pública: los botones de un proyecto, todos o de una sola imagen. */
  listarPorProyecto(proyectoId: number, escena?: EscenaPunto): Observable<Punto360[]> {
    const filtro = escena ? `?escena=${escena}` : '';
    return this.http.get<Punto360[]>(`${this.apiUrl}/proyecto/${proyectoId}${filtro}`);
  }

  crear(punto: Punto360Request): Observable<Punto360> {
    return this.http.post<Punto360>(this.apiUrl, punto);
  }

  actualizar(id: number, punto: Punto360Request): Observable<Punto360> {
    return this.http.put<Punto360>(`${this.apiUrl}/${id}`, punto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
