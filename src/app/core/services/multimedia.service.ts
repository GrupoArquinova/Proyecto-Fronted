import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { Multimedia } from '../models/multimedia.models';
import { ZonaComun } from '../models/zona-comun.models';
import { CasaModelo } from '../models/casa-modelo.models';
import { environment } from '../../../environments/environment';

/** Un archivo ya subido a Cloudinary, listo para asociarlo a una tipología. */
export interface ArchivoSubido {
  url: string;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class MultimediaService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/multimedia`;
  private zonasComunesUrl = `${environment.apiUrl}/zonas-comunes`;
  private casasModeloUrl = `${environment.apiUrl}/casas-modelo`;

  obtenerMultimedia(): Observable<Multimedia[]> {
    return this.http.get<Multimedia[]>(this.apiUrl);
  }

  /** Todos los recursos activos de una entidad. Para el administrador incluye los no publicados. */
  listarPorEntidad(
    tipoEntidad: 'proyecto' | 'lote' | 'zonaComun' | 'casaModelo' | 'etapa',
    entidadId: number
  ): Observable<Multimedia[]> {
    return this.http.get<Multimedia[]>(`${this.apiUrl}/${tipoEntidad}/${entidadId}`);
  }

  /** Recursos publicados de un proyecto, lote, zona común o casa modelo (sitio público). */
  listarPublicadosPorEntidad(
    tipoEntidad: 'proyecto' | 'lote' | 'zonaComun' | 'casaModelo' | 'etapa',
    entidadId: number
  ): Observable<Multimedia[]> {
    return this.http.get<Multimedia[]>(`${this.apiUrl}/${tipoEntidad}/${entidadId}`, {
      params: { soloPublicados: true }
    });
  }

  obtenerMultimediaPorId(id: number): Observable<Multimedia> {
    return this.http.get<Multimedia>(`${this.apiUrl}/${id}`);
  }

  crearMultimedia(multimedia: Partial<Multimedia>): Observable<Multimedia> {
    return this.http.post<Multimedia>(this.apiUrl, multimedia);
  }

  actualizarMultimedia(id: number, multimedia: Partial<Multimedia>): Observable<Multimedia> {
    return this.http.put<Multimedia>(`${this.apiUrl}/${id}`, multimedia);
  }

  eliminarMultimedia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Registro de un render (IMAGEN) o plano (PLANO) de una tipología. `orden` empieza en 1; el primer render es la portada. */
  recursoDeTipologia(casaId: number, tipo: 'IMAGEN' | 'PLANO', archivo: ArchivoSubido, orden: number): Partial<Multimedia> {
    return {
      casaModeloId: casaId,
      tipo,
      titulo: archivo.nombre.replace(/\.[^.]+$/, ''),
      url: archivo.url,
      nombreArchivo: archivo.nombre,
      orden,
      portada: tipo === 'IMAGEN' && orden === 1,
      publicado: true,
      activo: true
    };
  }

  /**
   * Asocia a una tipología recién creada los renders y planos que se subieron antes de guardarla. Se guardan en orden, uno tras
   * otro; devuelve cuántos no se pudieron asociar (0 si todo salió bien).
   */
  guardarArchivosDeTipologia(casaId: number, imagenes: ArchivoSubido[], planos: ArchivoSubido[]): Observable<number> {
    const recursos = [
      ...imagenes.map((a, i) => this.recursoDeTipologia(casaId, 'IMAGEN', a, i + 1)),
      ...planos.map((a, i) => this.recursoDeTipologia(casaId, 'PLANO', a, i + 1))
    ];
    if (recursos.length === 0) return of(0);
    return from(recursos).pipe(
      concatMap(r => this.crearMultimedia(r).pipe(map(() => 0), catchError(() => of(1)))),
      toArray(),
      map(resultados => resultados.reduce((a, b) => a + b, 0))
    );
  }

  /** Zonas comunes de UN proyecto específico (no existe endpoint "listar todas") */
  obtenerZonasComunesPorProyecto(proyectoId: number): Observable<ZonaComun[]> {
    return this.http.get<ZonaComun[]>(`${this.zonasComunesUrl}/proyecto/${proyectoId}`);
  }

  /** Casas modelo de UN proyecto específico (no existe endpoint "listar todas") */
  obtenerCasasModeloPorProyecto(proyectoId: number): Observable<CasaModelo[]> {
    return this.http.get<CasaModelo[]>(`${this.casasModeloUrl}/proyecto/${proyectoId}`);
  }
}