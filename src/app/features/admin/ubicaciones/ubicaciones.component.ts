import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ubicacion } from '../../../core/models/ubicacion.models';
import { Proyecto } from '../../../core/models/proyecto.models';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { UbicacionService } from '../../../core/services/ubicacion.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-ubicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ubicaciones.component.html',
  styleUrls: ['./ubicaciones.component.scss']
})
export class UbicacionesComponent implements OnInit {
  private ubicacionService = inject(UbicacionService);
  private proyectoService = inject(ProyectoService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  listaUbicaciones: Ubicacion[] = [];
  proyectosDisponibles: Proyecto[] = [];
  
  cargando = false;
  mostrarModal = false;
  guardando = false;
  editandoId: number | null = null;

  // Estructura del formulario mapeada exactamente a tu tabla SQL
  formData: Ubicacion = {
    proyectoId: 0,
    direccion: '',
    ciudad: '',
    departamento: '',
    referencias: '',
    latitud: undefined,
    longitud: undefined,
    googleMapsUrl: '',
    urbanismoUrl: '',
    vistaAereaUrl: '',
    recorrido360Url: '',
    videoComoLlegarUrl: ''
  };

  ngOnInit(): void {
    this.cargarUbicaciones();
    this.cargarProyectos();
  }

  cargarUbicaciones(): void {
    this.cargando = true;
    this.ubicacionService.obtenerUbicaciones().subscribe({
      next: (data) => {
        this.listaUbicaciones = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar ubicaciones:', err);
        this.toastService.showError('Error al cargar las ubicaciones');
        this.cargando = false;
      }
    });
  }

  cargarProyectos(): void {
    this.proyectoService.getProyectos().subscribe({
      next: (data) => {
        this.proyectosDisponibles = data;
      },
      error: (err) => {
        console.error('Error al cargar proyectos:', err);
        this.toastService.showError('Error al cargar los proyectos');
      }
    });
  }

  abrirModalCrear(): void {
    this.editandoId = null;
    this.formData = {
      proyectoId: 0,
      direccion: '',
      ciudad: '',
      departamento: '',
      referencias: '',
      latitud: undefined,
      longitud: undefined,
      googleMapsUrl: '',
      urbanismoUrl: '',
      vistaAereaUrl: '',
      recorrido360Url: '',
      videoComoLlegarUrl: ''
    };
    this.mostrarModal = true;
  }

  abrirDetalleUbicacion(item: Ubicacion): void {
    this.editandoId = item.id ?? null;
    this.formData = { ...item }; // Copia los datos para editarlos en el formulario
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarUbicacion(): void {
    this.guardando = true;
    const peticion = this.editandoId
      ? this.ubicacionService.actualizarUbicacion(this.editandoId, this.formData)
      : this.ubicacionService.crearUbicacion(this.formData);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.toastService.showSuccess('Ubicación guardada correctamente');
        this.cerrarModal();
        this.cargarUbicaciones();
      },
      error: (err) => {
        console.error('Error al guardar la ubicación:', err);
        this.toastService.showError('Error al guardar la ubicación');
        this.guardando = false;
      }
    });
  }

  async eliminarUbicacion(id: number): Promise<void> {
    const ubicacion = this.listaUbicaciones.find(u => u.id === id);
    const ok = await this.confirmDialog.open({
      title: 'Eliminar Ubicación',
      message: `¿Estás seguro de eliminar la ubicación "${ubicacion?.proyectoNombre || 'esta ubicación'}"?`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });
    if (!ok) return;
    this.ubicacionService.eliminarUbicacion(id).subscribe({
      next: () => {
        this.toastService.showSuccess('Ubicación eliminada correctamente');
        this.cargarUbicaciones();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.toastService.showError('Error al eliminar la ubicación');
      }
    });
  }
}