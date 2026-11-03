import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Metricas, PeriodoMetricas } from '../models/metricas.models';
import { normalizarMetricas } from '../utils/metricas';
import { environment } from '../../../environments/environment';

/** Métricas del panel (solicitudes, lotes, analítica del sitio y chat). Solo administrador y comercial. */
@Injectable({ providedIn: 'root' })
export class MetricasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/metricas`;

  obtener(periodo: PeriodoMetricas): Observable<Metricas> {
    const params = new HttpParams().set('desde', periodo.desde).set('hasta', periodo.hasta);
    return this.http.get<Partial<Metricas>>(this.apiUrl, { params }).pipe(map(normalizarMetricas));
  }
}
