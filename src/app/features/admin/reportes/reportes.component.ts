import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ReporteService } from '../../../core/services/reporte.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardResponse } from '../../../core/models/reporte.models';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private toastService = inject(ToastService);

  stats: DashboardResponse = {
    totalProyectos: 0,
    proyectosPublicados: 0,
    totalLotes: 0,
    lotesDisponibles: 0,
    lotesReservados: 0,
    lotesVendidos: 0,
    totalSolicitudes: 0,
    solicitudesNuevas: 0,
    distribucionLotesPorEstado: {},
    distribucionSolicitudesPorEstado: {}
  };

  cargando = false;
  
  // Lista dinámica de proyectos para el select de la ficha PDF
  listaProyectos: { id: number; nombre: string }[] = [];
  proyectoIdPdf: number = 1;

  ngOnInit(): void {
    this.cargarDashboard();
    this.cargarProyectos();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.reporteService.getDashboard().subscribe({
      next: (data) => {
        this.stats = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar el dashboard:', err);
        this.cargando = false;
        this.toastService.showError('Error al cargar los indicadores del sistema.');
      }
    });
  }

  cargarProyectos(): void {
    this.reporteService.getProyectosResumen().subscribe({
      next: (proyectos) => {
        this.listaProyectos = proyectos;
        if (proyectos && proyectos.length > 0) {
          this.proyectoIdPdf = proyectos[0].id; // Selecciona el primero por defecto
        }
      },
      error: (err) => {
        console.error('Error al cargar la lista de proyectos:', err);
        this.toastService.showError('Error al cargar proyectos');
      }
    });
  }

  private descargarArchivoBlob(peticion$: Observable<Blob>, nombreArchivo: string): void {
    this.cargando = true;
    peticion$.subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cargando = false;
        this.toastService.showSuccess(`Archivo "${nombreArchivo}" descargado con éxito.`);
      },
      error: (err) => {
        console.error('Error al descargar el archivo:', err);
        this.cargando = false;
        this.toastService.showError('No se pudo completar la descarga del documento.');
      }
    });
  }

  exportarExcelLotes(): void {
    this.descargarArchivoBlob(this.reporteService.descargarExcelLotes(), 'Reporte_Lotes.xlsx');
  }

  exportarExcelSolicitudes(): void {
    this.descargarArchivoBlob(this.reporteService.descargarExcelSolicitudes(), 'Reporte_Solicitudes.xlsx');
  }

  exportarExcelProyectos(): void {
    this.descargarArchivoBlob(this.reporteService.descargarExcelProyectos(), 'Reporte_Proyectos.xlsx');
  }

  descargarFichaPdf(): void {
    const proyectoId = Number(this.proyectoIdPdf) || 1;
    this.descargarArchivoBlob(
      this.reporteService.descargarFichaProyectoPdf(proyectoId), 
      `Ficha_Tecnica_Proyecto_${proyectoId}.pdf`
    );
  }

}