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

  // Secciones publicadas de una empresa (sitio público)
  obtenerPublicadosPorEmpresa(empresaId: number): Observable<ContenidoInstitucional[]> {
    return this.http.get<ContenidoInstitucional[]>(`${this.apiUrl}/empresa/${empresaId}`, {
      params: { soloPublicados: true }
    });
  }

  // Crear una nueva sección institucional (POST)
  guardarSeccion(data: ContenidoInstitucional): Observable<ContenidoInstitucional> {
    return this.http.post<ContenidoInstitucional>(this.apiUrl, data);
  }

  // Actualizar una sección existente (PUT)
  actualizarSeccion(id: number, data: Partial<ContenidoInstitucional>): Observable<ContenidoInstitucional> {
    return this.http.put<ContenidoInstitucional>(`${this.apiUrl}/${id}`, data);
  }

  // Nuevo método para eliminar una sección por su ID
  eliminarSeccion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}