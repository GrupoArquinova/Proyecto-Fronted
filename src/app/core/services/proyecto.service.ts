import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto, CrearProyectoDTO } from '../models/proyecto.models';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private http = inject(HttpClient);
  
  // URL base de tu backend en Spring Boot
  private apiUrl = 'http://localhost:8080/api/proyectos';

  /**
   * Obtiene la lista completa de proyectos registrados
   */
  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.apiUrl);
  }

  /**
   * Obtiene un proyecto por su ID
   */
  getProyectoPorId(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Envía un JSON con los datos del proyecto (incluida la URL de Cloudinary) a Spring Boot
   */
  crearProyecto(proyecto: CrearProyectoDTO): Observable<Proyecto> {
    return this.http.post<Proyecto>(this.apiUrl, proyecto);
  }

  /**
   * Actualiza la información de un proyecto existente
   */
  actualizarProyecto(id: number, proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<Proyecto>(`${this.apiUrl}/${id}`, proyecto);
  }

  /**
   * Elimina un proyecto por ID
   */
  eliminarProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}