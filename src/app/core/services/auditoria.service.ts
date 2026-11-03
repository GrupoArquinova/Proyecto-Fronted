import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { FiltroAuditoria, FiltrosAuditoria, PaginaAuditoria, RegistroAuditoria } from '../models/auditoria.models';
import { environment } from '../../../environments/environment';

const num = (v: unknown, defecto = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : defecto);

function registro(raw: Partial<RegistroAuditoria>): RegistroAuditoria {
  return {
    id: num(raw.id),
    usuarioId: raw.usuarioId ?? null,
    usuarioNombre: raw.usuarioNombre ?? '',
    accion: raw.accion ?? '',
    entidad: raw.entidad ?? '',
    entidadId: raw.entidadId ?? null,
    descripcion: raw.descripcion ?? null,
    creadoEn: raw.creadoEn ?? ''
  };
}

/** Historial de cambios del panel (solo administrador). */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/auditoria`;

  listar(filtro: FiltroAuditoria = {}): Observable<PaginaAuditoria> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor === undefined || valor === null || String(valor).trim() === '') continue;
      params = params.set(clave, String(valor).trim());
    }
    return this.http.get<Partial<PaginaAuditoria>>(this.apiUrl, { params }).pipe(
      map((r): PaginaAuditoria => {
        const contenido = Array.isArray(r?.contenido) ? r.contenido.map(registro) : [];
        return {
          contenido,
          pagina: num(r?.pagina),
          tamano: num(r?.tamano, contenido.length),
          totalElementos: num(r?.totalElementos, contenido.length),
          totalPaginas: num(r?.totalPaginas, contenido.length ? 1 : 0)
        };
      })
    );
  }

  filtros(): Observable<FiltrosAuditoria> {
    return this.http.get<Partial<FiltrosAuditoria>>(`${this.apiUrl}/filtros`).pipe(
      map(r => ({ entidades: Array.isArray(r?.entidades) ? r.entidades : [], acciones: Array.isArray(r?.acciones) ? r.acciones : [] }))
    );
  }
}
