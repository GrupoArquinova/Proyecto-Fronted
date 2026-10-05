import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResponse, LoteReporteItem, SolicitudReporteItem } from '../models/reporte.models';
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

  getReporteLotes(): Observable<LoteReporteItem[]> {
    return this.http.get<LoteReporteItem[]>(`${this.apiUrl}/lotes`);
  }

  getReporteSolicitudes(): Observable<SolicitudReporteItem[]> {
    return this.http.get<SolicitudReporteItem[]>(`${this.apiUrl}/solicitudes`);
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

  // Agrega esto para obtener la lista de proyectos (id y nombre)
  getProyectosResumen(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/proyectos`); // Ajusta la ruta según tu API de proyectos si es distinta
  }
}