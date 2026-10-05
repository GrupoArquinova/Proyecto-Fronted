import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Proyecto, CrearProyectoDTO, CatalogoPublico } from '../models/proyecto.models';
import { Lote } from '../models/lote.models';
import { LoteService } from './lote.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private http = inject(HttpClient);
  private loteService = inject(LoteService);
  
  // URL base de tu backend en Spring Boot
  private apiUrl = `${environment.apiUrl}/proyectos`;

  /**
   * Obtiene la lista completa de proyectos registrados
   */
  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.apiUrl);
  }

  /**
   * Proyectos + lotes publicados, combinados para las páginas públicas.
   * Es el único lugar que calcula totalLotes / lotesDisponibles y los valores por defecto.
   */
  obtenerCatalogoPublico(): Observable<CatalogoPublico> {
    return forkJoin({
      proyectos: this.getProyectos(),
      lotes: this.loteService.obtenerLotesPublicos()
    }).pipe(
      map(({ proyectos, lotes }) => ({
        totalLotes: lotes.length,
        proyectos: proyectos.map(p => {
          const delProyecto = lotes.filter(l => this.perteneceAProyecto(l, p));
          return {
            ...p,
            id: p.id as number,
            totalLotes: delProyecto.length,
            lotesDisponibles: delProyecto.filter(l => this.estaDisponible(l)).length,
            imagenUrl: p.imagenUrl || 'assets/images/default-project.svg',
            estado: p.estado || 'EN VENTA',
            ubicacion: p.ubicacion || 'Colombia',
            descripcion: p.descripcion
              || 'Proyecto campestre diseñado para quienes buscan tranquilidad, naturaleza y alta plusvalía.'
          };
        })
      }))
    );
  }

  private perteneceAProyecto(lote: Lote, proyecto: Proyecto): boolean {
    return lote.proyectoId !== undefined
      ? lote.proyectoId === proyecto.id
      : lote.proyectoNombre === proyecto.nombre;
  }

  private estaDisponible(lote: Lote): boolean {
    return lote.estadoId === 1 || lote.estadoNombre?.toUpperCase() === 'DISPONIBLE';
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