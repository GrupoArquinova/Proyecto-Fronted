import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ubicacion } from '../../../core/models/ubicacion.models';
import { Proyecto } from '../../../core/models/proyecto.models';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { UbicacionService } from '../../../core/services/ubicacion.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { validarArchivo } from '../../../core/utils/archivos';
import { EditorPuntosComponent } from './editor-puntos/editor-puntos.component';

@Component({
  selector: 'app-ubicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, EditorPuntosComponent],
  templateUrl: './ubicaciones.component.html',
  styleUrls: ['./ubicaciones.component.scss']
})
export class UbicacionesComponent implements OnInit {
  private ubicacionService = inject(UbicacionService);
  private proyectoService = inject(ProyectoService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private cloudinary = inject(CloudinaryService);

  /** Campo de imagen que se está subiendo en este momento (bloquea los demás botones de subida). */
  subiendoCampo: 'urbanismoUrl' | 'vistaAereaUrl' | 'recorrido360Url' | null = null;

  /** Ubicación cuyo editor de botones sobre las imágenes 360° está abierto. */
  readonly editorPuntos = signal<Ubicacion | null>(null);

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

  /** Sube una imagen desde el equipo a Cloudinary y deja su enlace en el campo correspondiente. */
  subirImagen(campo: 'urbanismoUrl' | 'vistaAereaUrl' | 'recorrido360Url', evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    const problema = validarArchivo(archivo, ['imagen']);
    if (problema) {
      this.toastService.showError(problema);
      return;
    }

    this.subiendoCampo = campo;
    this.cloudinary.subirArchivo(archivo).subscribe({
      next: resultado => {
        this.formData[campo] = resultado.url;
        this.subiendoCampo = null;
        this.toastService.showSuccess('Imagen subida. Recuerda guardar la ubicación.');
      },
      error: err => {
        console.error('Error al subir la imagen:', err);
        this.subiendoCampo = null;
        this.toastService.showError('No se pudo subir la imagen. Inténtalo de nuevo.');
      }
    });
  }

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
    const coordenadas = this.coordenadasValidas();
    if (!coordenadas) return;

    this.guardando = true;
    const datos = { ...this.formData, ...coordenadas };
    const peticion = this.editandoId
      ? this.ubicacionService.actualizarUbicacion(this.editandoId, datos)
      : this.ubicacionService.crearUbicacion(datos);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.toastService.showSuccess('Ubicación guardada correctamente');
        this.cerrarModal();
        this.cargarUbicaciones();
      },
      error: (err) => {
        console.error('Error al guardar la ubicación:', err);
        const detalle = typeof err?.error?.mensaje === 'string' ? `: ${err.error.mensaje}` : '';
        this.toastService.showError(`Error al guardar la ubicación${detalle}`);
        this.guardando = false;
      }
    });
  }

  /**
   * Latitud y longitud listas para enviar: dentro de su rango y con 7 decimales (lo que guarda la base de datos).
   * Si alguna está mal (por ejemplo, un punto decimal que se perdió al pegar), avisa y no envía nada.
   */
  private coordenadasValidas(): { latitud?: number; longitud?: number } | null {
    const leer = (valor: unknown, limite: number, nombre: string): number | undefined | null => {
      if (valor === null || valor === undefined || valor === '') return undefined;
      const n = Number(valor);
      if (!Number.isFinite(n) || Math.abs(n) > limite) {
        this.toastService.showError(`La ${nombre} debe estar entre -${limite} y ${limite} (por ejemplo ${nombre === 'latitud' ? '4.5388890' : '-75.6727780'}). Revisa el punto decimal.`);
        return null;
      }
      return Math.round(n * 1e7) / 1e7;
    };

    const latitud = leer(this.formData.latitud, 90, 'latitud');
    if (latitud === null) return null;
    const longitud = leer(this.formData.longitud, 180, 'longitud');
    if (longitud === null) return null;
    return { latitud, longitud };
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