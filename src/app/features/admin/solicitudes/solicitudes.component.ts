import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Solicitud } from '../../../core/models/solicitud.models';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.component.html',
  styleUrls: ['./solicitudes.component.scss']
})
export class SolicitudesComponent implements OnInit {
  private solicitudService = inject(SolicitudService);
  private toastService = inject(ToastService);

  listaSolicitudes: Solicitud[] = [];
  cargando = false;
  filtroEstado: number | null = null;

  solicitudSeleccionada: Solicitud | null = null;
  mostrarModalNotas = false;
  observacionTemporal = '';

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.cargando = true;
    this.solicitudService.obtenerSolicitudes().subscribe({
      next: (data) => {
        this.listaSolicitudes = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar solicitudes:', err);
        this.toastService.showError('Error al cargar las solicitudes');
        this.cargando = false;
      }
    });
  }

  get solicitudesFiltradas(): Solicitud[] {
    if (this.filtroEstado === null) {
      return this.listaSolicitudes;
    }
    return this.listaSolicitudes.filter(s => s.estadoId === this.filtroEstado);
  }

  filtrarPorEstado(estadoId: number | null): void {
    this.filtroEstado = estadoId;
  }

  cambiarEstado(item: Solicitud, nuevoEstadoId: number): void {
    this.solicitudService.atenderSolicitud(item.id, {
      estadoId: nuevoEstadoId,
      observacionesInternas: item.observacionesInternas
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Estado de la solicitud actualizado');
        this.cargarSolicitudes();
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
        this.toastService.showError('Error al actualizar el estado');
      }
    });
  }

  obtenerClaseEstado(estadoId: number): string {
    switch (estadoId) {
      case 1: return 'badge-nueva';
      case 2: return 'badge-contactada';
      case 3: return 'badge-seguimiento';
      case 4: return 'badge-atendida';
      case 6: return 'badge-cerrada';
      default: return 'badge-nueva';
    }
  }

  abrirModalNotas(solicitud: Solicitud): void {
    this.solicitudSeleccionada = solicitud;
    this.observacionTemporal = solicitud.observacionesInternas || '';
    this.mostrarModalNotas = true;
  }

  cerrarModalNotas(): void {
    this.mostrarModalNotas = false;
    this.solicitudSeleccionada = null;
  }

  guardarObservacion(): void {
    if (!this.solicitudSeleccionada) return;

    this.solicitudService.atenderSolicitud(this.solicitudSeleccionada.id, {
      estadoId: this.solicitudSeleccionada.estadoId,
      observacionesInternas: this.observacionTemporal
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Observación guardada correctamente');
        this.cargarSolicitudes();
        this.cerrarModalNotas();
      },
      error: (err) => {
        console.error('Error al guardar observación:', err);
        this.toastService.showError('Error al guardar la observación');
      }
    });
  }
}