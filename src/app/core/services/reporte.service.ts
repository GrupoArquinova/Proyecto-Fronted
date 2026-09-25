import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResponse, LoteReporteItem, SolicitudReporteItem } from '../models/reporte.models';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/api/reportes';

  /**
   * Obtiene los indicadores generales del dashboard (RF22)
   */
  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Obtiene el reporte de lotes, usado para calcular el estado por proyecto (RF24)
   */
  getReporteLotes(): Observable<LoteReporteItem[]> {
    return this.http.get<LoteReporteItem[]>(`${this.apiUrl}/lotes`);
  }

  /**
   * Obtiene el reporte de solicitudes de contacto (RF26)
   */
  getReporteSolicitudes(): Observable<SolicitudReporteItem[]> {
    return this.http.get<SolicitudReporteItem[]>(`${this.apiUrl}/solicitudes`);
  }
}