import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ZonaComunImagen } from '../models/zona-comun-imagen.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ZonaComunImagenService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zonas-comunes-imagenes`;

  listarPorZona(zonaComunId: number): Observable<ZonaComunImagen[]> {
    return this.http.get<ZonaComunImagen[]>(`${this.apiUrl}/zona-comun/${zonaComunId}`);
  }

  crear(imagen: ZonaComunImagen): Observable<ZonaComunImagen> {
    return this.http.post<ZonaComunImagen>(this.apiUrl, imagen);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  marcarComoPrincipal(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/principal`, {});
  }

  actualizar(id: number, imagen: ZonaComunImagen): Observable<ZonaComunImagen> {
  return this.http.put<ZonaComunImagen>(`${this.apiUrl}/${id}`, imagen);
}
}