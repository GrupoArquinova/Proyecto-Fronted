import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Solicitud } from '../models/solicitud.models';

export interface AtenderSolicitudPayload {
  estadoId: number;
  observacionesInternas?: string;
  atendidaPorId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/solicitudes-contacto';

  obtenerSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.apiUrl);
  }

  /**
   * Único endpoint del backend para cambiar estado y/o notas internas.
   * Siempre manda ambos campos juntos para no pisar el que no se está editando.
   */
  atenderSolicitud(id: number, payload: AtenderSolicitudPayload): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.apiUrl}/${id}/atender`, payload);
  }

  eliminarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}