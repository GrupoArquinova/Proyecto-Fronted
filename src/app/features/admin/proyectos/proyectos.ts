import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { Proyecto, CrearProyectoDTO } from '../../../core/models/proyecto.models';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './proyectos.html',
  styleUrls: ['./proyectos.scss']
})
export class ProyectosComponent implements OnInit {
  private proyectoService = inject(ProyectoService);
  private cloudinaryService = inject(CloudinaryService);
  private fb = inject(FormBuilder);

  private readonly EMPRESA_ID = 1;

  proyectos: Proyecto[] = [];
  loading = false;
  errorMsg = '';

  // Control del Modal / Formulario
  mostrarModal = false;
  modoEdicion = false;
  proyectoEditandoId: number | null = null;

  // Estado de la subida de imagen
  subiendoImagen = false;
  errorImagen = '';
  nombreArchivoSeleccionado = '';

  proyectoForm: FormGroup = this.fb.group({
    empresaId:        [this.EMPRESA_ID, Validators.required],
    nombre:           ['', [Validators.required, Validators.minLength(3)]],
    slug:             [''],
    descripcion:      [''],
    estadoProyecto:   ['PLANIFICACION', Validators.required],
    publicado:        [false],
    imagenUrl:        [''],
    fechaLanzamiento: ['']
  });

  ngOnInit(): void {
    this.cargarProyectos();
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
        this.errorMsg = 'No se pudieron cargar los proyectos.';
        this.loading = false;
      }
    });
  }

  // --- Subida de imagen a Cloudinary ---
  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorImagen = '';
    this.subiendoImagen = true;
    this.nombreArchivoSeleccionado = file.name;

    this.cloudinaryService.subirImagen(file).subscribe({
      next: (secureUrl) => {
        this.proyectoForm.patchValue({ imagenUrl: secureUrl });
        this.subiendoImagen = false;
      },
      error: (err) => {
        console.error('Error subiendo imagen a Cloudinary:', err);
        this.errorImagen = 'No se pudo subir la imagen. Intenta de nuevo.';
        this.subiendoImagen = false;
        this.nombreArchivoSeleccionado = '';
      }
    });

    // Limpia el input para permitir volver a seleccionar el mismo archivo si hace falta
    input.value = '';
  }

  quitarImagen(): void {
    this.proyectoForm.patchValue({ imagenUrl: '' });
    this.nombreArchivoSeleccionado = '';
  }

  // --- Abrir Modal Crear ---
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
      estadoProyecto: 'PLANIFICACION',
      publicado: false,
      imagenUrl: '',
      fechaLanzamiento: ''
    });
    this.mostrarModal = true;
  }

  // --- Abrir Modal Editar ---
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
      estadoProyecto:   proyecto.estadoProyecto ?? 'PLANIFICACION',
      publicado:        proyecto.publicado ?? false,
      imagenUrl:        proyecto.imagenUrl ?? '',
      fechaLanzamiento: proyecto.fechaLanzamiento ?? ''
    });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  // --- Guardar (Crear o Actualizar) ---
  guardarProyecto(): void {
    if (this.proyectoForm.invalid) {
      this.proyectoForm.markAllAsTouched();
      return;
    }

    const formValue = this.proyectoForm.value;

    if (this.modoEdicion && this.proyectoEditandoId !== null) {
      this.proyectoService.actualizarProyecto(this.proyectoEditandoId, formValue).subscribe({
        next: (proyectoActualizado) => {
          const index = this.proyectos.findIndex(p => p.id === proyectoActualizado.id);
          if (index !== -1) {
            this.proyectos[index] = proyectoActualizado;
          }
          this.cerrarModal();
        },
        error: (err) => console.error('Error actualizando proyecto:', err)
      });
    } else {
      const dto: CrearProyectoDTO = formValue;
      this.proyectoService.crearProyecto(dto).subscribe({
        next: (nuevoProyecto) => {
          this.proyectos.unshift(nuevoProyecto);
          this.cerrarModal();
        },
        error: (err) => console.error('Error creando proyecto:', err)
      });
    }
  }

  // --- Cambiar estado Publicado ---
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
      },
      error: (err) => console.error('Error cambiando visibilidad:', err)
    });
  }

  // --- Eliminar Proyecto ---
  eliminarProyecto(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      this.proyectoService.eliminarProyecto(id).subscribe({
        next: () => {
          this.proyectos = this.proyectos.filter(p => p.id !== id);
        },
        error: (err) => console.error('Error eliminando proyecto:', err)
      });
    }
  }
}