import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Viewer } from '@photo-sphere-viewer/core';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Proyecto, CrearProyectoDTO, ETAPAS_PROYECTO, TIPOS_REGISTRO, TIPOS_PROYECTO, etiquetaEtapa } from '../../../core/models/proyecto.models';

export type FiltroProyectos = 'activos' | 'inactivos' | 'todos';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './proyectos.html',
  styleUrls: ['./proyectos.scss']
})
export class ProyectosComponent implements OnInit, OnDestroy {
  private proyectoService = inject(ProyectoService);
  private cloudinaryService = inject(CloudinaryService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private fb = inject(FormBuilder);

  private readonly EMPRESA_ID = 1;

  proyectos: Proyecto[] = [];
  /** Qué proyectos se listan: por defecto los activos; los inactivos se ven con su filtro. */
  filtro: FiltroProyectos = 'activos';
  loading = false;
  errorMsg = '';

  // Control del Modal / Formulario
  mostrarModal = false;
  modoEdicion = false;
  proyectoEditandoId: number | null = null;

  // Modal / Visor 360° con Photo Sphere Viewer
  imagenExpandidaUrl: string | null = null;
  private viewer360: Viewer | null = null;

  // Estado del archivo y carga de Cloudinary
  errorImagen = '';
  nombreArchivoSeleccionado = '';
  subiendoImagen = false;

  proyectoForm: FormGroup = this.fb.group({
    empresaId:        [this.EMPRESA_ID, Validators.required],
    nombre:           ['', [Validators.required, Validators.minLength(3)]],
    slug:             [''],
    descripcion:      [''],
    estadoProyecto:   ['EN_DISENO', Validators.required],
    tipoRegistro:     ['OFERTA_COMERCIAL', Validators.required],
    tipoProyecto:     [''],
    participacion:    [''],
    destacado:        [false],
    publicado:        [false],
    imagenUrl:        [''],
    fechaLanzamiento: ['']
  });

  ngOnInit(): void {
    this.cargarProyectos();
  }

  /** Un proyecto sin el dato `activo` se considera activo. */
  esActivo(proyecto: Proyecto): boolean {
    return proyecto.activo !== false;
  }

  get totalActivos(): number {
    return this.proyectos.filter(p => this.esActivo(p)).length;
  }

  get totalInactivos(): number {
    return this.proyectos.length - this.totalActivos;
  }

  get proyectosVisibles(): Proyecto[] {
    switch (this.filtro) {
      case 'activos': return this.proyectos.filter(p => this.esActivo(p));
      case 'inactivos': return this.proyectos.filter(p => !this.esActivo(p));
      default: return this.proyectos;
    }
  }

  /** "EN_CONSTRUCCION" se muestra como "En construccion" en la tarjeta. */
  readonly etapas = ETAPAS_PROYECTO;
  readonly tiposRegistro = TIPOS_REGISTRO;
  readonly tiposProyecto = TIPOS_PROYECTO;

  etiquetaEstado(estado?: string): string {
    return etiquetaEtapa(estado);
  }

  ngOnDestroy(): void {
    if (this.viewer360) {
      this.viewer360.destroy();
    }
  }

  // --- Subida directa de imagen a Cloudinary ---
  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorImagen = '';
    this.nombreArchivoSeleccionado = file.name;
    this.subiendoImagen = true;

    this.cloudinaryService.subirArchivo(file).subscribe({
      next: (response: { url: string }) => {
        this.proyectoForm.patchValue({ imagenUrl: response.url });
        this.subiendoImagen = false;
      },
      error: (err) => {
        console.error('Error al subir la imagen a Cloudinary:', err);
        this.toastService.showError('Error al subir la imagen a Cloudinary');
        this.errorImagen = 'No se pudo subir la imagen. Inténtalo de nuevo.';
        this.subiendoImagen = false;
        this.nombreArchivoSeleccionado = '';
      }
    });

    input.value = '';
  }

  quitarImagen(): void {
    this.proyectoForm.patchValue({ imagenUrl: '' });
    this.nombreArchivoSeleccionado = '';
  }

  // --- Visor 360° (Photo Sphere Viewer) ---
  ampliarImagen(url: string | undefined): void {
    if (!url) return;
    this.imagenExpandidaUrl = url;

    setTimeout(() => {
      this.initVisor360(url);
    }, 250);
  }

  initVisor360(url: string): void {
    if (this.viewer360) {
      try {
        this.viewer360.destroy();
      } catch (e) {}
      this.viewer360 = null;
    }

    const contenedor = document.getElementById('panorama-viewer');
    if (contenedor) {
      contenedor.innerHTML = '';
    }

    setTimeout(() => {
      try {
        if (contenedor) {
          this.viewer360 = new Viewer({
            container: contenedor as HTMLElement,
            panorama: url,
            size: { width: '100%', height: '500px' },
            navbar: [
              'zoom',
              'move',
              'fullscreen'
            ]
          });
        }
      } catch (e) {
        console.error('Error al inicializar Photo Sphere Viewer:', e);
      }
    }, 250);
  }

  cerrarImagen(): void {
    if (this.viewer360) {
      try {
        this.viewer360.destroy();
      } catch (e) {}
      this.viewer360 = null;
    }
    this.imagenExpandidaUrl = null;
  }

  cargarProyectos(): void {
    this.loading = true;
    this.proyectoService.getProyectos().subscribe({
      next: (data) => {
        this.proyectos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando proyectos:', err);
        this.toastService.showError('No se pudieron cargar los proyectos');
        this.errorMsg = 'No se pudieron cargar los proyectos.';
        this.loading = false;
      }
    });
  }

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.proyectoEditandoId = null;
    this.errorImagen = '';
    this.nombreArchivoSeleccionado = '';

    this.proyectoForm.reset({
      empresaId: this.EMPRESA_ID,
      nombre: '',
      slug: '',
      descripcion: '',
      estadoProyecto: 'EN_DISENO',
      tipoRegistro: 'OFERTA_COMERCIAL',
      tipoProyecto: '',
      participacion: '',
      destacado: false,
      publicado: false,
      imagenUrl: '',
      fechaLanzamiento: ''
    });
    this.mostrarModal = true;
  }

  abrirModalEditar(proyecto: Proyecto): void {
    this.modoEdicion = true;
    this.proyectoEditandoId = proyecto.id ?? null;
    this.errorImagen = '';
    this.nombreArchivoSeleccionado = '';

    this.proyectoForm.patchValue({
      empresaId:        proyecto.empresaId ?? this.EMPRESA_ID,
      nombre:           proyecto.nombre,
      slug:             proyecto.slug ?? '',
      descripcion:      proyecto.descripcion ?? '',
      estadoProyecto:   proyecto.estadoProyecto ?? 'EN_DISENO',
      tipoRegistro:     proyecto.tipoRegistro ?? 'OFERTA_COMERCIAL',
      tipoProyecto:     proyecto.tipoProyecto ?? '',
      participacion:    proyecto.participacion ?? '',
      destacado:        proyecto.destacado ?? false,
      publicado:        proyecto.publicado ?? false,
      imagenUrl:        proyecto.imagenUrl ?? '',
      fechaLanzamiento: proyecto.fechaLanzamiento ?? ''
    });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarProyecto(): void {
    if (this.proyectoForm.invalid) {
      this.proyectoForm.markAllAsTouched();
      return;
    }

    const formValue = {
      ...this.proyectoForm.value,
      tipoProyecto: this.proyectoForm.value.tipoProyecto || null
    };

    if (this.modoEdicion && this.proyectoEditandoId !== null) {
      this.proyectoService.actualizarProyecto(this.proyectoEditandoId, formValue).subscribe({
        next: (proyectoActualizado) => {
          const index = this.proyectos.findIndex(p => p.id === proyectoActualizado.id);
          if (index !== -1) {
            this.proyectos[index] = proyectoActualizado;
          }
          this.toastService.showSuccess('Proyecto actualizado correctamente');
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error actualizando proyecto:', err);
          this.toastService.showError('Error al actualizar el proyecto');
        }
      });
    } else {
      const dto: CrearProyectoDTO = formValue;
      this.proyectoService.crearProyecto(dto).subscribe({
        next: (nuevoProyecto) => {
          this.proyectos.unshift(nuevoProyecto);
          this.toastService.showSuccess('Proyecto creado correctamente');
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error creando proyecto:', err);
          this.toastService.showError('Error al crear el proyecto');
        }
      });
    }
  }

  togglePublicado(proyecto: Proyecto): void {
    const nuevoEstado = !proyecto.publicado;
    this.proyectoService.actualizarProyecto(proyecto.id!, {
      empresaId: proyecto.empresaId,
      nombre: proyecto.nombre,
      slug: proyecto.slug,
      publicado: nuevoEstado
    }).subscribe({
      next: (res) => {
        proyecto.publicado = res.publicado;
        this.toastService.showSuccess('Estado de publicación actualizado');
      },
      error: (err) => {
        console.error('Error cambiando visibilidad:', err);
        this.toastService.showError('Error al cambiar la visibilidad del proyecto');
      }
    });
  }

  async eliminarProyecto(id: number): Promise<void> {
    const proyecto = this.proyectos.find(p => p.id === id);
    const ok = await this.confirmDialog.open({
      title: 'Eliminar Proyecto',
      message: `¿Estás seguro de que deseas eliminar "${proyecto?.nombre || 'este proyecto'}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });
    if (!ok) return;
    this.proyectoService.eliminarProyecto(id).subscribe({
      next: () => {
        this.proyectos = this.proyectos.filter(p => p.id !== id);
        this.toastService.showSuccess('Proyecto eliminado correctamente');
      },
      error: (err) => {
        console.error('Error eliminando proyecto:', err);
        this.toastService.showError('Error al eliminar el proyecto');
      }
    });
  }
}