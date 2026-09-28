import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Etapa, EtapaRequest, ProyectoRef } from '../../../core/models/etapa.models';
import { EtapaService } from '../../../core/services/etapa.service';

@Component({
  selector: 'app-etapas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etapas.component.html',
  styleUrls: ['./etapas.component.scss']
})
export class EtapasComponent implements OnInit {
  private etapaService = inject(EtapaService);

  etapas: Etapa[] = [];
  proyectosDisponibles: ProyectoRef[] = [];
  cargando: boolean = false;
  mostrarModal: boolean = false;
  guardando: boolean = false;
  esEdicion: boolean = false;
  etapaEditandoId: number | null = null;

  // Formulario temporal adaptado a EtapaRequestDTO
  nuevaEtapa = {
    nombre: '',
    descripcion: '',
    orden: 1,
    activo: true,
    proyectoId: null as number | null
  };

  ngOnInit(): void {
    this.cargarEtapas();
    this.cargarProyectos();
  }

  cargarEtapas(): void {
    this.cargando = true;
    this.etapaService.obtenerEtapas().subscribe({
      next: (data) => {
        // Aseguramos el mapeo de proyecto para la vista
        this.etapas = data.map(etapa => ({
          ...etapa,
          proyecto: {
            id: etapa.proyectoId,
            nombre: etapa.proyectoNombre || 'Sin asignación'
          }
        }));
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar etapas:', err);
        this.cargando = false;
      }
    });
  }

  cargarProyectos(): void {
    this.etapaService.obtenerProyectos().subscribe({
      next: (data) => (this.proyectosDisponibles = data),
      error: (err) => console.error('Error al cargar proyectos:', err)
    });
  }

  abrirModalCrear(): void {
    this.esEdicion = false;
    this.etapaEditandoId = null;
    this.nuevaEtapa = {
      nombre: '',
      descripcion: '',
      orden: 1,
      activo: true,
      proyectoId: this.proyectosDisponibles.length > 0 ? this.proyectosDisponibles[0].id : null
    };
    this.mostrarModal = true;
  }

  abrirModalEditar(etapa: Etapa): void {
    if (!etapa.id) return;
    this.esEdicion = true;
    this.etapaEditandoId = etapa.id;
    this.nuevaEtapa = {
      nombre: etapa.nombre,
      descripcion: etapa.descripcion || '',
      orden: etapa.orden || 1,
      activo: etapa.activo ?? true,
      proyectoId: etapa.proyectoId || etapa.proyecto?.id || null
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarEtapa(): void {
    if (!this.nuevaEtapa.nombre || !this.nuevaEtapa.proyectoId) return;

    this.guardando = true;

    // Payload exacto exigido por EtapaRequestDTO
    const payload: EtapaRequest = {
      proyectoId: Number(this.nuevaEtapa.proyectoId),
      nombre: this.nuevaEtapa.nombre,
      descripcion: this.nuevaEtapa.descripcion || undefined,
      orden: Number(this.nuevaEtapa.orden) || 1,
      activo: this.nuevaEtapa.activo
    };

    if (this.esEdicion && this.etapaEditandoId) {
      this.etapaService.actualizarEtapa(this.etapaEditandoId, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModal();
          this.cargarEtapas();
        },
        error: (err) => {
          console.error('Error al actualizar la etapa:', err);
          this.guardando = false;
        }
      });
    } else {
      this.etapaService.crearEtapa(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModal();
          this.cargarEtapas();
        },
        error: (err) => {
          console.error('Error al crear la etapa:', err);
          this.guardando = false;
        }
      });
    }
  }

  eliminarEtapa(etapa: Etapa): void {
    if (!etapa.id) return;
    if (confirm(`¿Estás seguro de eliminar la etapa "${etapa.nombre}"?`)) {
      this.etapaService.eliminarEtapa(etapa.id).subscribe({
        next: () => this.cargarEtapas(),
        error: (err) => console.error('Error al eliminar etapa:', err)
      });
    }
  }

  getBadgeClass(activo?: boolean): string {
    return activo ? 'badge-finalizada' : 'badge-planificada';
  }
}