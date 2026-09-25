import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReporteService } from '../../../core/services/reporte.service';
import { AuthService } from '../../../core/services/auth.service';
import { SolicitudReporteItem, LoteReporteItem } from '../../../core/models/reporte.models';

interface EstadoProyectoResumen {
  nombre: string;
  ocupados: number;
  total: number;
  porcentaje: number;
}

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen.html',
  styleUrl: './resumen.scss',
})
export class Resumen implements OnInit {
  private reporteService = inject(ReporteService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  cargando = true;
  error = '';

  disponibles = 0;
  reservados = 0;
  vendidos = 0;
  solicitudesNuevas = 0;

  estadoProyectos: EstadoProyectoResumen[] = [];
  ultimasSolicitudes: SolicitudReporteItem[] = [];

  ngOnInit(): void {
    // 1. Verificar primero si estamos en el navegador (no en Node/SSR)
    // 2. Verificar que exista un token activo ANTES de invocar las peticiones
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.getToken();
      if (token) {
        this.cargarResumen();
      } else {
        this.cargando = false;
      }
    } else {
      this.cargando = false;
    }
  }

  private cargarResumen(): void {
    this.cargando = true;
    this.error = '';

    this.reporteService.getDashboard().subscribe({
      next: (dashboard) => {
        this.disponibles = dashboard.lotesDisponibles;
        this.reservados = dashboard.lotesReservados;
        this.vendidos = dashboard.lotesVendidos;
        this.solicitudesNuevas = dashboard.solicitudesNuevas;
      },
      error: () => {
        this.error = 'No se pudo cargar el resumen general.';
      },
    });

    this.reporteService.getReporteLotes().subscribe({
      next: (lotes) => {
        this.estadoProyectos = this.agruparPorProyecto(lotes);
      },
      error: () => {
        this.error = 'No se pudo cargar el estado de los proyectos.';
      },
    });

    this.reporteService.getReporteSolicitudes().subscribe({
      next: (solicitudes) => {
        this.ultimasSolicitudes = solicitudes.slice(0, 4);
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar las últimas solicitudes.';
        this.cargando = false;
      },
    });
  }

  private agruparPorProyecto(lotes: LoteReporteItem[]): EstadoProyectoResumen[] {
    const mapa = new Map<string, { ocupados: number; total: number }>();

    for (const lote of lotes) {
      if (!lote.activo) continue;

      const actual = mapa.get(lote.proyectoNombre) ?? { ocupados: 0, total: 0 };
      actual.total += 1;
      if (lote.estadoComercial?.toUpperCase() !== 'DISPONIBLE') {
        actual.ocupados += 1;
      }
      mapa.set(lote.proyectoNombre, actual);
    }

    return Array.from(mapa.entries()).map(([nombre, datos]) => ({
      nombre,
      ocupados: datos.ocupados,
      total: datos.total,
      porcentaje: datos.total > 0 ? (datos.ocupados / datos.total) * 100 : 0,
    }));
  }

  claseEstado(estado: string): string {
    const valor = estado?.toUpperCase() ?? '';
    if (valor === 'NUEVA' || valor === 'NUEVO') return 'badge-nuevo';
    if (valor === 'ATENDIDA' || valor === 'ATENDIDO') return 'badge-atendido';
    if (valor === 'DESCARTADA' || valor === 'DESCARTADO') return 'badge-descartado';
    return 'badge-nuevo';
  }
}