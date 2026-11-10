import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ActividadReporteItem, DashboardResponse, EstadoComercialItem, EtapaReporteItem, FiltroReporte, LoteReporteItem,
  ProyectoReporteItem, ReporteId, SolicitudReporteItem
} from '../models/reporte.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes`;
  private apiDocumentos = `${environment.apiUrl}/documentos`;

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/dashboard`);
  }

  /** Solo viajan los filtros que tienen valor; los reportes del servidor ya traen por defecto lo activo. */
  private parametros(filtro: FiltroReporte): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor === null || valor === undefined || valor === '' || valor === false) continue;
      params = params.set(clave, String(valor));
    }
    return params;
  }

  getReporteLotes(filtro: FiltroReporte = {}): Observable<LoteReporteItem[]> {
    return this.http.get<LoteReporteItem[]>(`${this.apiUrl}/lotes`, { params: this.parametros(filtro) });
  }

  getReporteSolicitudes(filtro: FiltroReporte = {}): Observable<SolicitudReporteItem[]> {
    return this.http.get<SolicitudReporteItem[]>(`${this.apiUrl}/solicitudes`, { params: this.parametros(filtro) });
  }

  getReporteProyectos(filtro: FiltroReporte = {}): Observable<ProyectoReporteItem[]> {
    return this.http.get<ProyectoReporteItem[]>(`${this.apiUrl}/proyectos`, { params: this.parametros(filtro) });
  }

  getReporteEtapas(filtro: FiltroReporte = {}): Observable<EtapaReporteItem[]> {
    return this.http.get<EtapaReporteItem[]>(`${this.apiUrl}/etapas`, { params: this.parametros(filtro) });
  }

  getEstadosComerciales(filtro: FiltroReporte = {}): Observable<EstadoComercialItem[]> {
    return this.http.get<EstadoComercialItem[]>(`${this.apiUrl}/estados-comerciales`, { params: this.parametros(filtro) });
  }

  getReporteActividad(filtro: FiltroReporte = {}): Observable<ActividadReporteItem[]> {
    return this.http.get<ActividadReporteItem[]>(`${this.apiUrl}/actividad`, { params: this.parametros(filtro) });
  }

  /** Exporta un reporte con los mismos filtros que se ven en pantalla. */
  exportar(formato: 'excel' | 'pdf', reporte: ReporteId, filtro: FiltroReporte = {}): Observable<Blob> {
    return this.http.get(`${this.apiDocumentos}/${formato}/${reporte}`, { params: this.parametros(filtro), responseType: 'blob' });
  }

  // --- Métodos de Exportación / Documentos ---
  descargarExcelLotes(): Observable<Blob> {
    return this.http.get(`${this.apiDocumentos}/excel/lotes`, { responseType: 'blob' });
  }

  descargarExcelProyectos(): Observable<Blob> {
    return this.http.get(`${this.apiDocumentos}/excel/proyectos`, { responseType: 'blob' });
  }

  descargarExcelSolicitudes(): Observable<Blob> {
    return this.http.get(`${this.apiDocumentos}/excel/solicitudes`, { responseType: 'blob' });
  }

  descargarFichaProyectoPdf(proyectoId: number): Observable<Blob> {
    return this.http.get(`${this.apiDocumentos}/pdf/proyecto/${proyectoId}/ficha-tecnica`, { responseType: 'blob' });
  }

}