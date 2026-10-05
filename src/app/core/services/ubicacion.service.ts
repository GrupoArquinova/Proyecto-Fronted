import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ubicacion } from '../models/ubicacion.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UbicacionService {
  private http = inject(HttpClient);
  
  // Cambia esta URL según la ruta de tu API backend
  private apiUrl = `${environment.apiUrl}/ubicaciones`; 
  private proyectosUrl = `${environment.apiUrl}/proyectos`; // O la ruta donde obtienes tus proyectos

  obtenerUbicaciones(): Observable<Ubicacion[]> {
    return this.http.get<Ubicacion[]>(this.apiUrl);
  }

  obtenerUbicacionPorId(id: number): Observable<Ubicacion> {
    return this.http.get<Ubicacion>(`${this.apiUrl}/${id}`);
  }

  crearUbicacion(ubicacion: Ubicacion): Observable<Ubicacion> {
    return this.http.post<Ubicacion>(this.apiUrl, ubicacion);
  }

  actualizarUbicacion(id: number, ubicacion: Ubicacion): Observable<Ubicacion> {
    return this.http.put<Ubicacion>(`${this.apiUrl}/${id}`, ubicacion);
  }

  eliminarUbicacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Método para obtener el listado de proyectos disponibles para el selector
  obtenerProyectos(): Observable<any[]> {
    return this.http.get<any[]>(this.proyectosUrl);
  }
}