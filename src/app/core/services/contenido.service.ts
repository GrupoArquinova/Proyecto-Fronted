import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContenidoInstitucional } from '../models/contenido.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContenidoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contenidos-institucionales`;

  // Obtener todas las secciones por ID de empresa
  obtenerContenidosPorEmpresa(empresaId: number): Observable<ContenidoInstitucional[]> {
    return this.http.get<ContenidoInstitucional[]>(`${this.apiUrl}/empresa/${empresaId}`);
  }

  // Crear una nueva sección institucional (POST)
  guardarSeccion(data: any): Observable<ContenidoInstitucional> {
    return this.http.post<ContenidoInstitucional>(this.apiUrl, data);
  }

  // Actualizar una sección existente (PUT)
  actualizarSeccion(id: number, data: Partial<ContenidoInstitucional>): Observable<ContenidoInstitucional> {
    return this.http.put<ContenidoInstitucional>(`${this.apiUrl}/${id}`, data);
  }

  // Nuevo método para eliminar una sección por su ID
  eliminarSeccion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}