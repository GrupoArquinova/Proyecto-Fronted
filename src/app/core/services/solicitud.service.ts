import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoSolicitud, Solicitud, SolicitudPublicaRequest } from '../models/solicitud.models';
import { environment } from '../../../environments/environment';
import { IdiomaService } from './idioma.service';

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
  private idioma = inject(IdiomaService);
  private apiUrl = `${environment.apiUrl}/solicitudes-contacto`;

  obtenerSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.apiUrl);
  }

  /** Estados de atención activos, en su orden (NUEVO, EN_GESTION, CERRADO). */
  obtenerEstados(): Observable<EstadoSolicitud[]> {
    return this.http.get<EstadoSolicitud[]>(`${environment.apiUrl}/estados-solicitud/activos`);
  }

  // Corregido para apuntar a la ruta pública del backend
  enviarSolicitud(datos: SolicitudPublicaRequest): Observable<Solicitud> {
    // Cada solicitud lleva el idioma del sitio: así se le responde y se le confirma en ese idioma
    return this.http.post<Solicitud>(`${this.apiUrl}/publico`, { ...datos, idioma: this.idioma.idioma() });
  }

  atenderSolicitud(id: number, payload: AtenderSolicitudPayload): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.apiUrl}/${id}/atender`, payload);
  }

  eliminarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}