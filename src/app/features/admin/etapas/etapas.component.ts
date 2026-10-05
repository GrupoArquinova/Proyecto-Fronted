import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Etapa, EtapaRequest } from '../../../core/models/etapa.models';
import { Proyecto } from '../../../core/models/proyecto.models';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { EtapaService } from '../../../core/services/etapa.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-etapas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etapas.component.html',
  styleUrls: ['./etapas.component.scss']
})
export class EtapasComponent implements OnInit {
  private etapaService = inject(EtapaService);
  private proyectoService = inject(ProyectoService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  etapas: Etapa[] = [];
  proyectosDisponibles: Proyecto[] = [];
  cargando: boolean = false;
  mostrarModal: boolean = false;
  guardando: boolean = false;
  esEdicion: boolean = false;
  etapaEditandoId: number | null = null;

  // Filtro por Proyecto en la cabecera
  filtroProyectoId: string = '';

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

  // Getter para filtrar las etapas según el select del header
  get etapasFiltradas() {
    if (!this.filtroProyectoId) {
      return this.etapas;
    }
    return this.etapas.filter(etapa => String(etapa.proyectoId) === String(this.filtroProyectoId));
  }

  // Lista única de proyectos presentes en las etapas para llenar el select del filtro
  get proyectosParaFiltro() {
    const unicos = new Map();
    this.etapas.forEach(etapa => {
      const id = etapa.proyectoId || etapa.proyecto?.id;
      const nombre = etapa.proyectoNombre || etapa.proyecto?.nombre;
      if (id && nombre) {
        unicos.set(id, nombre);
      }
    });
    return Array.from(unicos, ([id, nombre]) => ({ id, nombre }));
  }

  cargarEtapas(): void {
    this.cargando = true;
    this.etapaService.obtenerEtapas().subscribe({
      next: (data) => {
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
        this.toastService.showError('Error al cargar las etapas');
        this.cargando = false;
      }
    });
  }

  cargarProyectos(): void {
    this.proyectoService.getProyectos().subscribe({
      next: (data) => (this.proyectosDisponibles = data),
      error: (err) => {
        console.error('Error al cargar proyectos:', err);
        this.toastService.showError('Error al cargar proyectos');
      }
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
      proyectoId: this.proyectosDisponibles.length > 0 ? (this.proyectosDisponibles[0].id ?? null) : null
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
          this.toastService.showSuccess('Etapa actualizada correctamente');
          this.cerrarModal();
          this.cargarEtapas();
        },
        error: (err) => {
          console.error('Error al actualizar la etapa:', err);
          this.toastService.showError('Error al actualizar la etapa');
          this.guardando = false;
        }
      });
    } else {
      this.etapaService.crearEtapa(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.toastService.showSuccess('Etapa creada correctamente');
          this.cerrarModal();
          this.cargarEtapas();
        },
        error: (err) => {
          console.error('Error al crear la etapa:', err);
          this.toastService.showError('Error al crear la etapa');
          this.guardando = false;
        }
      });
    }
  }

  async eliminarEtapa(etapa: Etapa): Promise<void> {
    if (!etapa.id) return;
    const ok = await this.confirmDialog.open({
      title: 'Eliminar Etapa',
      message: `¿Estás seguro de eliminar la etapa "${etapa.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });
    if (!ok) return;
    this.etapaService.eliminarEtapa(etapa.id).subscribe({
      next: () => {
        this.toastService.showSuccess('Etapa eliminada correctamente');
        this.cargarEtapas();
      },
      error: (err) => {
        console.error('Error al eliminar etapa:', err);
        this.toastService.showError('Error al eliminar la etapa');
      }
    });
  }

  getBadgeClass(activo?: boolean): string {
    return activo ? 'badge-finalizada' : 'badge-planificada';
  }
}