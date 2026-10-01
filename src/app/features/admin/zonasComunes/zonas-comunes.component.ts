import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZonaComunService } from '../../../core/services/zona-comun.service';
import { ZonaComun } from '../../../core/models/zona-comun.models';
import { ReporteService } from '../../../core/services/reporte.service';
import { ZonaComunImagenService } from '../../../core/services/zona-comun-imagen.service';
import { ZonaComunImagen } from '../../../core/models/zona-comun-imagen.models';
import { CloudinaryService } from '../../../core/services/cloudinary.service';

@Component({
  selector: 'app-zonas-comunes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zonas-comunes.component.html',
  styleUrls: ['./zonas-comunes.component.scss']
})
export class ZonasComunesComponent implements OnInit {
  private zonaService = inject(ZonaComunService);
  private reporteService = inject(ReporteService);
  private zonaImagenService = inject(ZonaComunImagenService);
  private cloudinaryService = inject(CloudinaryService);

  mostrarModalImagenes = false;
  zonaSeleccionadaParaGaleria: ZonaComun | null = null;
  listaImagenesZona: ZonaComunImagen[] = [];
  archivoSeleccionado: File | null = null;

  // Estado de subida a Cloudinary
  subiendoImagen = false;
  errorImagen = '';

  // Imágenes cuya URL falló al cargar
  imagenesConError = new Set<number>();

  // Modo edición dentro de la galería: si tiene valor, el formulario
  // superior pasa a "editar" en vez de "agregar".
  imagenEditandoId: number | null = null;

  nuevaImagen: ZonaComunImagen = {
    zonaComunId: 0,
    imagenUrl: '',
    titulo: '',
    esPrincipal: false
  };

  listaZonas: ZonaComun[] = [];
  listaProyectos: any[] = [];

  proyectoIdSeleccionado: string | number = 'todos';

  mostrarModalEliminar = false;
  zonaAEliminarId: number | null = null;

  cargando = false;
  mostrarModal = false;
  esEdicion = false;
  mensajeAlerta = '';

  zonaActual: ZonaComun = {
    proyectoId: 1,
    nombre: '',
    descripcion: '',
    publicado: true,
    activo: true
  };

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.reporteService.getProyectosResumen().subscribe({
      next: (proyectos) => {
        this.listaProyectos = proyectos;
        this.cargarZonas();
      },
      error: (err) => console.error('Error al cargar proyectos', err)
    });
  }

  cargarZonas(): void {
    this.cargando = true;

    if (this.proyectoIdSeleccionado === 'todos') {
      if (this.listaProyectos.length === 0) {
        this.listaZonas = [];
        this.cargando = false;
        return;
      }

      let peticionesCompletadas = 0;
      let zonasAcumuladas: ZonaComun[] = [];

      this.listaProyectos.forEach(proj => {
        this.zonaService.listarPorProyecto(proj.id).subscribe({
          next: (zonas) => {
            const zonasConProyecto = zonas.map(z => ({ ...z, proyectoNombre: proj.nombre }));
            zonasAcumuladas.push(...zonasConProyecto);
            peticionesCompletadas++;

            if (peticionesCompletadas === this.listaProyectos.length) {
              this.listaZonas = zonasAcumuladas;
              this.cargando = false;
            }
          },
          error: () => {
            peticionesCompletadas++;
            if (peticionesCompletadas === this.listaProyectos.length) {
              this.listaZonas = zonasAcumuladas;
              this.cargando = false;
            }
          }
        });
      });
    } else {
      const projId = Number(this.proyectoIdSeleccionado);
      const proyectoActual = this.listaProyectos.find(p => p.id === projId);

      this.zonaService.listarPorProyecto(projId).subscribe({
        next: (data) => {
          this.listaZonas = data.map(z => ({
            ...z,
            proyectoNombre: proyectoActual ? proyectoActual.nombre : 'Proyecto ' + projId
          }));
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error al cargar zonas comunes', err);
          this.cargando = false;
          this.mostrarAlerta('Error al obtener las zonas comunes.');
        }
      });
    }
  }

  abrirModalCrear(): void {
    this.esEdicion = false;
    const defaultProj = this.proyectoIdSeleccionado !== 'todos'
      ? Number(this.proyectoIdSeleccionado)
      : (this.listaProyectos.length > 0 ? this.listaProyectos[0].id : 1);

    this.zonaActual = {
      proyectoId: defaultProj,
      nombre: '',
      descripcion: '',
      publicado: true,
      activo: true
    };
    this.mostrarModal = true;
  }

  abrirModalEditar(zona: ZonaComun): void {
    this.esEdicion = true;
    this.zonaActual = { ...zona };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarZona(): void {
    if (!this.zonaActual.nombre.trim()) {
      this.mostrarAlerta('El nombre de la zona común es obligatorio.');
      return;
    }

    if (!this.zonaActual.proyectoId) {
      this.mostrarAlerta('Debe asociar la zona común a un proyecto.');
      return;
    }

    this.cargando = true;
    if (this.esEdicion && this.zonaActual.id) {
      this.zonaService.actualizar(this.zonaActual.id, this.zonaActual).subscribe({
        next: () => {
          this.cargando = false;
          this.mostrarAlerta('Zona común actualizada con éxito.');
          this.cerrarModal();
          this.cargarZonas();
        },
        error: (err) => {
          this.cargando = false;
          console.error(err);
          this.mostrarAlerta('Error al actualizar la zona común.');
        }
      });
    } else {
      this.zonaService.crear(this.zonaActual).subscribe({
        next: () => {
          this.cargando = false;
          this.mostrarAlerta('Zona común creada con éxito.');
          this.cerrarModal();
          this.cargarZonas();
        },
        error: (err) => {
          this.cargando = false;
          console.error(err);
          this.mostrarAlerta('Error al crear la zona común.');
        }
      });
    }
  }

  prepararEliminacion(id?: number): void {
    if (!id) return;
    this.zonaAEliminarId = id;
    this.mostrarModalEliminar = true;
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar = false;
    this.zonaAEliminarId = null;
  }

  confirmarEliminacion(): void {
    if (!this.zonaAEliminarId) return;

    this.cargando = true;
    this.zonaService.eliminar(this.zonaAEliminarId).subscribe({
      next: () => {
        this.cargando = false;
        this.cerrarModalEliminar();
        this.mostrarAlerta('Zona común eliminada correctamente.');
        this.cargarZonas();
      },
      error: (err) => {
        this.cargando = false;
        this.cerrarModalEliminar();
        console.error(err);
        this.mostrarAlerta('No se pudo eliminar el registro.');
      }
    });
  }

  // --- MÉTODOS PARA GALERÍA E IMÁGENES ---
  abrirGaleriaImagenes(zona: ZonaComun): void {
    this.zonaSeleccionadaParaGaleria = zona;
    this.cancelarEdicionImagen();
    this.cargarImagenesDeZona(zona.id!);
    this.mostrarModalImagenes = true;
  }

  cargarImagenesDeZona(zonaId: number): void {
    this.zonaImagenService.listarPorZona(zonaId).subscribe({
      next: (imgs) => this.listaImagenesZona = imgs,
      error: (err) => console.error('Error al cargar imágenes de la zona', err)
    });
  }

  cerrarModalImagenes(): void {
    this.mostrarModalImagenes = false;
    this.zonaSeleccionadaParaGaleria = null;
    this.listaImagenesZona = [];
    this.archivoSeleccionado = null;
    this.cancelarEdicionImagen();
  }

  /** Sube el archivo a Cloudinary en vez de convertirlo a base64. */
  onArchivoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.archivoSeleccionado = file;
    this.subiendoImagen = true;
    this.errorImagen = '';

    this.cloudinaryService.subirImagen(file).subscribe({
      next: (secureUrl) => {
        this.nuevaImagen.imagenUrl = secureUrl;
        this.subiendoImagen = false;
      },
      error: (err) => {
        console.error('Error subiendo imagen a Cloudinary:', err);
        this.errorImagen = 'No se pudo subir la imagen. Intenta de nuevo.';
        this.subiendoImagen = false;
        this.archivoSeleccionado = null;
      }
    });
  }

  /** Guarda la imagen: crea una nueva, o actualiza si está en modo edición. */
  agregarImagenAZona(): void {
    if (!this.nuevaImagen.imagenUrl.trim()) {
      this.mostrarAlerta('Debe ingresar una URL o seleccionar un archivo de imagen.');
      return;
    }

    if (this.imagenEditandoId) {
      this.zonaImagenService.actualizar(this.imagenEditandoId, this.nuevaImagen).subscribe({
        next: () => {
          this.cargarImagenesDeZona(this.zonaSeleccionadaParaGaleria!.id!);
          this.cancelarEdicionImagen();
          this.mostrarAlerta('Imagen actualizada correctamente.');
        },
        error: (err) => {
          console.error('Error al actualizar imagen', err);
          this.mostrarAlerta('Error al actualizar la imagen.');
        }
      });
    } else {
      this.zonaImagenService.crear(this.nuevaImagen).subscribe({
        next: () => {
          this.cargarImagenesDeZona(this.zonaSeleccionadaParaGaleria!.id!);
          this.resetFormularioImagen();
          this.mostrarAlerta('Imagen agregada a la galería correctamente.');
        },
        error: (err) => {
          console.error('Error al agregar imagen', err);
          this.mostrarAlerta('Error al guardar la imagen.');
        }
      });
    }
  }

  /** Carga los datos de una imagen existente en el formulario para editarla. */
  editarImagenZona(img: ZonaComunImagen): void {
    this.imagenEditandoId = img.id!;
    this.nuevaImagen = { ...img };
    this.archivoSeleccionado = null;
    this.errorImagen = '';
  }

  /** Sale del modo edición y vuelve al formulario de "agregar". */
  cancelarEdicionImagen(): void {
    this.imagenEditandoId = null;
    this.resetFormularioImagen();
  }

  private resetFormularioImagen(): void {
    this.nuevaImagen = {
      zonaComunId: this.zonaSeleccionadaParaGaleria?.id ?? 0,
      imagenUrl: '',
      titulo: '',
      esPrincipal: false
    };
    this.archivoSeleccionado = null;
    this.errorImagen = '';
  }

  eliminarImagenZona(id?: number): void {
    if (!id) return;
    if (confirm('¿Desea eliminar esta imagen de la galería?')) {
      this.zonaImagenService.eliminar(id).subscribe({
        next: () => {
          if (this.imagenEditandoId === id) {
            this.cancelarEdicionImagen();
          }
          this.cargarImagenesDeZona(this.zonaSeleccionadaParaGaleria!.id!);
          this.mostrarAlerta('Imagen eliminada.');
        },
        error: (err) => console.error('Error al eliminar imagen', err)
      });
    }
  }

  marcarImagenConError(id?: number): void {
    if (id) this.imagenesConError.add(id);
  }

  private mostrarAlerta(msg: string): void {
    this.mensajeAlerta = msg;
    setTimeout(() => this.mensajeAlerta = '', 4000);
  }
}