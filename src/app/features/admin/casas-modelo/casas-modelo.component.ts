import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto } from '../../../core/models/proyecto.models';
import { CasaModelo } from '../../../core/models/casa-modelo.models';
import { CasaModeloService } from '../../../core/services/casa-modelo.service';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { MultimediaService } from '../../../core/services/multimedia.service';
import { ToastService } from '../../../core/services/toast.service';
import { Multimedia, TipoMultimedia } from '../../../core/models/multimedia.models';
import { SubidaArchivoComponent } from '../../../shared/components/subida-archivo/subida-archivo.component';

@Component({
  selector: 'app-casas-modelo',
  standalone: true,
  imports: [CommonModule, FormsModule, SubidaArchivoComponent],
  templateUrl: './casas-modelo.component.html',
  styleUrls: ['./casas-modelo.component.scss']
})
export class CasasModeloComponent implements OnInit {
  private casaModeloService = inject(CasaModeloService);
  private proyectoService = inject(ProyectoService);
  private multimediaService = inject(MultimediaService);
  private toast = inject(ToastService);

  listaCasas: CasaModelo[] = [];
  listaProyectos: Proyecto[] = [];
  modalAbierto = false;
  /** Imágenes (renders) y planos subidos de la tipología que se está editando. */
  imagenes: Multimedia[] = [];
  planos: Multimedia[] = [];
  esEdicion = false;

  casaActual: CasaModelo = {
    proyectoId: 0,
    nombre: '',
    descripcion: '',
    areaConstruidaM2: undefined,
    numeroHabitaciones: undefined,
    numeroBanos: undefined,
    tourVirtualUrl: '',
    planoUrl: '',
    publicado: true,
    activo: true
  };

  ngOnInit(): void {
    this.cargarCasas();
    this.cargarProyectos();
  }

  cargarCasas(): void {
    this.casaModeloService.listar().subscribe({
      next: (data) => this.listaCasas = data,
      error: (err) => console.error('Error al cargar casas modelo', err)
    });
  }

  cargarProyectos(): void {
    this.proyectoService.getProyectos().subscribe({
      next: (data) => this.listaProyectos = data,
      error: (err) => console.error('Error al cargar proyectos', err)
    });
  }

  abrirModalCrear(): void {
    this.esEdicion = false;
    this.casaActual = {
      proyectoId: this.listaProyectos.length > 0 ? (this.listaProyectos[0].id ?? 0) : 0,
      nombre: '',
      descripcion: '',
      areaConstruidaM2: undefined,
      numeroHabitaciones: undefined,
      numeroBanos: undefined,
      tourVirtualUrl: '',
      planoUrl: '',
      publicado: true,
      activo: true
    };
    this.modalAbierto = true;
  }

  abrirModalEditar(casa: CasaModelo): void {
    this.esEdicion = true;
    this.casaActual = { ...casa };
    this.imagenes = [];
    this.planos = [];
    this.modalAbierto = true;
    this.cargarArchivos();
  }

  private cargarArchivos(): void {
    const id = this.casaActual.id;
    if (id == null) return;
    this.multimediaService.listarPorEntidad('casaModelo', id).subscribe({
      next: lista => {
        const ordenada = [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0));
        this.imagenes = ordenada.filter(m => m.tipo === 'IMAGEN');
        this.planos = ordenada.filter(m => m.tipo === 'PLANO');
      },
      error: () => this.toast.showError('No se pudieron cargar las imágenes de la tipología.')
    });
  }

  /** Guarda en la tipología un archivo ya subido a Cloudinary (render o plano). */
  agregarArchivo(tipo: Extract<TipoMultimedia, 'IMAGEN' | 'PLANO'>, archivo: { url: string; nombre: string }): void {
    const id = this.casaActual.id;
    if (id == null) return;
    const lista = tipo === 'IMAGEN' ? this.imagenes : this.planos;
    const recurso: Partial<Multimedia> = {
      casaModeloId: id,
      tipo,
      titulo: archivo.nombre.replace(/\.[^.]+$/, ''),
      url: archivo.url,
      nombreArchivo: archivo.nombre,
      orden: Math.max(0, ...lista.map(m => m.orden ?? 0)) + 1,
      portada: tipo === 'IMAGEN' && lista.length === 0,
      publicado: true,
      activo: true
    };
    this.multimediaService.crearMultimedia(recurso).subscribe({
      next: creado => {
        if (tipo === 'IMAGEN') this.imagenes = [...this.imagenes, creado];
        else this.planos = [...this.planos, creado];
      },
      error: () => this.toast.showError('El archivo se subió pero no se pudo asociar a la tipología.')
    });
  }

  quitarArchivo(recurso: Multimedia): void {
    if (recurso.id == null || !confirm('¿Quitar este archivo de la tipología?')) return;
    this.multimediaService.eliminarMultimedia(recurso.id).subscribe({
      next: () => {
        this.imagenes = this.imagenes.filter(m => m.id !== recurso.id);
        this.planos = this.planos.filter(m => m.id !== recurso.id);
      },
      error: () => this.toast.showError('No se pudo quitar el archivo.')
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  guardarCasa(): void {
    if (this.esEdicion && this.casaActual.id) {
      this.casaModeloService.actualizar(this.casaActual.id, this.casaActual).subscribe({
        next: () => {
          this.cargarCasas();
          this.cerrarModal();
        },
        error: (err) => console.error('Error al actualizar casa modelo', err)
      });
    } else {
      this.casaModeloService.crear(this.casaActual).subscribe({
        next: () => {
          this.cargarCasas();
          this.cerrarModal();
        },
        error: (err) => console.error('Error al crear casa modelo', err)
      });
    }
  }

  eliminarCasa(id?: number): void {
    if (!id) return;
    if (confirm('¿Estás seguro de eliminar esta tipología?')) {
      this.casaModeloService.eliminar(id).subscribe({
        next: () => this.cargarCasas(),
        error: (err) => console.error('Error al eliminar casa modelo', err)
      });
    }
  }
}