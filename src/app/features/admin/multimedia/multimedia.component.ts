import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Viewer } from '@photo-sphere-viewer/core';
import { Multimedia, TipoMultimedia } from '../../../core/models/multimedia.models';
import { Proyecto } from '../../../core/models/proyecto.models';
import { Lote } from '../../../core/models/lote.models';
import { ZonaComun } from '../../../core/models/zona-comun.models';
import { CasaModelo } from '../../../core/models/casa-modelo.models';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { LoteService } from '../../../core/services/lote.service';
import { MultimediaService } from '../../../core/services/multimedia.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

type TipoPadre = 'proyecto' | 'lote' | 'zonaComun' | 'casaModelo';

@Component({
  selector: 'app-multimedia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multimedia.component.html',
  styleUrls: ['./multimedia.component.scss']
})
export class MultimediaComponent implements OnInit, OnDestroy {
  private multimediaService = inject(MultimediaService);
  private proyectoService = inject(ProyectoService);
  private loteService = inject(LoteService);
  private cloudinaryService = inject(CloudinaryService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  listaMultimedia: Multimedia[] = [];
  multimediaFiltrada: Multimedia[] = [];
  proyectosDisponibles: Proyecto[] = [];
  lotesDisponibles: Lote[] = [];
  zonasComunesDisponibles: ZonaComun[] = [];
  casasModelosDisponibles: CasaModelo[] = [];

  cargando = false;
  mostrarModal = false;
  guardando = false;
  editandoId: number | null = null;

  filtroTitulo = '';
  filtroTipo = '';

  // --- Control del Visor 360 ---
  mostrarModal360 = false;
  url360Actual = '';
  titulo360Actual = '';
  private viewer360: Viewer | null = null;

  // --- Selección en cascada del padre ---
  tipoPadre: TipoPadre = 'proyecto';
  proyectoReferenciaId: number | null = null;

  // --- Subida a Cloudinary ---
  subiendoArchivo = false;
  errorArchivo = '';
  nombreArchivoSeleccionado = '';

  formData = {
    proyectoId: null as number | null,
    loteId: null as number | null,
    zonaComunId: null as number | null,
    casaModeloId: null as number | null,
    tipo: 'IMAGEN' as TipoMultimedia,
    titulo: '',
    descripcion: '',
    url: '',
    nombreArchivo: '',
    mimeType: '',
    tamanoBytes: undefined as number | undefined,
    orden: 1,
    portada: false,
    publicado: true,
    activo: true
  };

  ngOnInit(): void {
    this.cargarMultimedia();
    this.cargarCatalogosBase();
  }

  ngOnDestroy(): void {
    if (this.viewer360) {
      this.viewer360.destroy();
    }
  }

  cargarMultimedia(): void {
    this.cargando = true;
    this.multimediaService.obtenerMultimedia().subscribe({
      next: (data) => {
        this.listaMultimedia = data;
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar multimedia:', err);
        this.toastService.showError('Error al cargar multimedia');
        this.cargando = false;
      }
    });
  }

  cargarCatalogosBase(): void {
    this.proyectoService.getProyectos().subscribe(res => this.proyectosDisponibles = res);
    this.loteService.obtenerLotes().subscribe(res => this.lotesDisponibles = res);
  }

  aplicarFiltros(): void {
    this.multimediaFiltrada = this.listaMultimedia.filter(item => {
      const matchTitulo = this.filtroTitulo
        ? item.titulo?.toLowerCase().includes(this.filtroTitulo.toLowerCase().trim())
        : true;
      const matchTipo = this.filtroTipo ? item.tipo === this.filtroTipo : true;
      return matchTitulo && matchTipo;
    });
  }

  // --- Control para ampliar imagen ---
  imagenAmpliadaUrl: string | null = null;
  imagenAmpliadaTitulo: string = '';

  abrirImagenAmpliada(item: Multimedia): void {
    if (item.tipo === 'IMAGEN') {
      this.imagenAmpliadaUrl = item.url;
      this.imagenAmpliadaTitulo = item.titulo || 'Vista ampliada';
    }
  }

  cerrarImagenAmpliada(): void {
    this.imagenAmpliadaUrl = null;
    this.imagenAmpliadaTitulo = '';
  }

  onCambioTipoPadre(): void {
    this.formData.proyectoId = null;
    this.formData.loteId = null;
    this.formData.zonaComunId = null;
    this.formData.casaModeloId = null;
    this.proyectoReferenciaId = null;
    this.zonasComunesDisponibles = [];
    this.casasModelosDisponibles = [];
  }

  onCambioProyectoReferencia(): void {
    if (!this.proyectoReferenciaId) {
      this.zonasComunesDisponibles = [];
      this.casasModelosDisponibles = [];
      return;
    }

    if (this.tipoPadre === 'zonaComun') {
      this.multimediaService.obtenerZonasComunesPorProyecto(this.proyectoReferenciaId).subscribe({
        next: (res) => this.zonasComunesDisponibles = res,
        error: (err) => {
          console.error('Error cargando zonas comunes:', err);
          this.toastService.showError('Error cargando zonas comunes');
        }
      });
    } else if (this.tipoPadre === 'casaModelo') {
      this.multimediaService.obtenerCasasModeloPorProyecto(this.proyectoReferenciaId).subscribe({
        next: (res) => this.casasModelosDisponibles = res,
        error: (err) => {
          console.error('Error cargando casas modelo:', err);
          this.toastService.showError('Error cargando casas modelo');
        }
      });
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorArchivo = '';
    this.subiendoArchivo = true;
    this.nombreArchivoSeleccionado = file.name;

    this.cloudinaryService.subirArchivo(file).subscribe({
      next: (resultado) => {
        this.formData.url = resultado.url;
        this.formData.nombreArchivo = file.name;
        this.formData.mimeType = file.type;
        this.formData.tamanoBytes = file.size;
        this.subiendoArchivo = false;
      },
      error: (err) => {
        console.error('Error subiendo archivo a Cloudinary:', err);
        this.toastService.showError('No se pudo subir el archivo a Cloudinary');
        this.errorArchivo = 'No se pudo subir el archivo. Intenta de nuevo.';
        this.subiendoArchivo = false;
        this.nombreArchivoSeleccionado = '';
      }
    });

    input.value = '';
  }

  quitarArchivo(): void {
    this.formData.url = '';
    this.formData.nombreArchivo = '';
    this.formData.mimeType = '';
    this.formData.tamanoBytes = undefined;
    this.nombreArchivoSeleccionado = '';
  }

  abrirModalCrear(): void {
    this.editandoId = null;
    this.tipoPadre = 'proyecto';
    this.proyectoReferenciaId = null;
    this.zonasComunesDisponibles = [];
    this.casasModelosDisponibles = [];
    this.errorArchivo = '';
    this.nombreArchivoSeleccionado = '';
    this.formData = {
      proyectoId: null,
      loteId: null,
      zonaComunId: null,
      casaModeloId: null,
      tipo: 'IMAGEN',
      titulo: '',
      descripcion: '',
      url: '',
      nombreArchivo: '',
      mimeType: '',
      tamanoBytes: undefined,
      orden: 1,
      portada: false,
      publicado: true,
      activo: true
    };
    this.mostrarModal = true;
  }

  editarMultimedia(item: Multimedia): void {
    this.editandoId = item.id ?? null;
    this.errorArchivo = '';
    this.nombreArchivoSeleccionado = item.nombreArchivo ?? '';

    if (item.proyectoId) this.tipoPadre = 'proyecto';
    else if (item.loteId) this.tipoPadre = 'lote';
    else if (item.zonaComunId) this.tipoPadre = 'zonaComun';
    else this.tipoPadre = 'casaModelo';

    this.formData = {
      proyectoId: item.proyectoId ?? null,
      loteId: item.loteId ?? null,
      zonaComunId: item.zonaComunId ?? null,
      casaModeloId: item.casaModeloId ?? null,
      tipo: item.tipo,
      titulo: item.titulo ?? '',
      descripcion: item.descripcion ?? '',
      url: item.url,
      nombreArchivo: item.nombreArchivo ?? '',
      mimeType: item.mimeType ?? '',
      tamanoBytes: item.tamanoBytes,
      orden: item.orden ?? 1,
      portada: item.portada,
      publicado: item.publicado,
      activo: item.activo
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarMultimedia(): void {
    this.guardando = true;
    const peticion = this.editandoId
      ? this.multimediaService.actualizarMultimedia(this.editandoId, this.formData)
      : this.multimediaService.crearMultimedia(this.formData);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.toastService.showSuccess('Multimedia guardada exitosamente');
        this.cerrarModal();
        this.cargarMultimedia();
      },
      error: (err) => {
        console.error('Error al guardar multimedia:', err);
        this.toastService.showError('Error al guardar archivo multimedia');
        this.guardando = false;
      }
    });
  }

  async eliminarMultimedia(id: number): Promise<void> {
    const item = this.listaMultimedia.find(m => m.id === id);
    const ok = await this.confirmDialog.open({
      title: 'Eliminar Archivo',
      message: `¿Estás seguro de eliminar "${item?.titulo || 'este archivo'}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });
    if (!ok) return;
    this.multimediaService.eliminarMultimedia(id).subscribe({
      next: () => {
        this.toastService.showSuccess('Archivo multimedia eliminado');
        this.cargarMultimedia();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.toastService.showError('Error al eliminar el archivo multimedia');
      }
    });
  }

  abrirVisor360(item: Multimedia): void {
    if (item.tipo !== 'PANORAMICA_360') return;
    this.url360Actual = item.url;
    this.titulo360Actual = item.titulo || 'Vista Panorámica 360°';
    this.mostrarModal360 = true;

    setTimeout(() => {
      const container = document.querySelector('#viewerContainer360') as HTMLElement;
      if (container) {
        if (this.viewer360) {
          this.viewer360.destroy();
        }
        this.viewer360 = new Viewer({
          container: container,
          panorama: this.url360Actual,
          size: { width: '100%', height: '500px' },
          navbar: ['zoom', 'move', 'fullscreen']
        });
      }
    }, 100);
  }

  cerrarModal360(): void {
    this.mostrarModal360 = false;
    if (this.viewer360) {
      this.viewer360.destroy();
      this.viewer360 = null;
    }
  }

  calcularVinculoTexto(item: Multimedia): string {
    if (item.proyectoNombre) return `Proyecto: ${item.proyectoNombre}`;
    if (item.loteCodigo) return `Lote: ${item.loteCodigo}`;
    if (item.zonaComunNombre) return `Zona común: ${item.zonaComunNombre}`;
    if (item.casaModeloNombre) return `Casa modelo: ${item.casaModeloNombre}`;
    return 'Sin vínculo';
  }

  manejarErrorImagen(event: Event): void {
    const element = event.target as HTMLImageElement;
    // Evita bucles infinitos si la imagen de respaldo tampoco carga
    if (!element.src.includes('data:image/svg+xml')) {
      element.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2364748b">Sin Imagen / Error</text></svg>';
    }
  }
}