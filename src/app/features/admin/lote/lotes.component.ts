import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lote, EstadoLote, Etapa } from '../../../core/models/lote.models';
import { LoteService, Proyecto } from '../../../core/services/lote.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lotes.component.html',
  styleUrls: ['./lotes.component.scss']
})
export class LotesComponent implements OnInit {
  private loteService = inject(LoteService);
  private toastService = inject(ToastService);

  lotes: Lote[] = [];
  lotesFiltrados: Lote[] = []; // Lista que se renderiza en la tabla
  proyectosDisponibles: Proyecto[] = [];
  etapasDisponibles: Etapa[] = [];
  etapasFiltradas: Etapa[] = [];
  
  cargando: boolean = false;
  mostrarModal: boolean = false;
  guardando: boolean = false;

  // Variables de filtros y buscadores
  filtroCodigo: string = '';
  filtroProyecto: string = '';
  filtroActivo: boolean | null = null; // null = Todos, true = Activos, false = Inactivos

  estadosDisponibles: EstadoLote[] = [
    { id: 1, nombre: 'Disponible' },
    { id: 2, nombre: 'Reservado' },
    { id: 3, nombre: 'Vendido' }
  ];

  nuevoLote = {
    id: null as number | null,
    codigo: '',
    nombre: '',
    areaM2: null as number | null,
    proyectoId: null as number | null,
    etapaId: null as number | null,
    estadoId: 1,
    descripcion: ''
  };

  ngOnInit(): void {
    this.cargarLotes();
    this.cargarProyectos();
    this.cargarEtapas();
  }

  cargarLotes(): void {
    this.cargando = true;
    this.loteService.obtenerLotes().subscribe({
      next: (data: Lote[]) => {
        this.lotes = data.map(lote => ({
          ...lote,
          estadoId: lote.estadoId ?? 1,
          activo: lote.activo ?? true
        }));
        // Aplicar filtros inmediatamente al cargar los datos
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.toastService.showError('Error al cargar los lotes');
        this.cargando = false;
      }
    });
  }

  /**
   * Lógica principal para filtrar por código de lote, nombre de proyecto y estado activo/inactivo.
   */
  aplicarFiltros(): void {
    this.lotesFiltrados = this.lotes.filter(lote => {
      // 1. Coincidencia por código de lote (Ej: "LT-104")
      const coincideCodigo = this.filtroCodigo
        ? lote.codigo.toLowerCase().includes(this.filtroCodigo.toLowerCase().trim())
        : true;

      // 2. Coincidencia por nombre de proyecto
      const nombreProyecto = this.obtenerNombreProyecto(lote).toLowerCase();
      const coincideProyecto = this.filtroProyecto
        ? nombreProyecto.includes(this.filtroProyecto.toLowerCase().trim())
        : true;

      // 3. Coincidencia por estado activo/inactivo
      const coincideActivo = this.filtroActivo !== null
        ? lote.activo === this.filtroActivo
        : true;

      return coincideCodigo && coincideProyecto && coincideActivo;
    });
  }

  cargarProyectos(): void {
    this.loteService.obtenerProyectos().subscribe({
      next: (data) => (this.proyectosDisponibles = data),
      error: (err) => {
        console.error('Error al cargar proyectos:', err);
        this.toastService.showError('Error al cargar proyectos');
      }
    });
  }

  cargarEtapas(): void {
    this.loteService.obtenerEtapas().subscribe({
      next: (data) => {
        this.etapasDisponibles = data;
        this.etapasFiltradas = data;
      },
      error: (err) => {
        console.error('Error al cargar etapas:', err);
        this.toastService.showError('Error al cargar etapas');
      }
    });
  }

  obtenerNombreProyecto(lote: Lote): string {
    if (lote.proyectoNombre) return lote.proyectoNombre;

    const etapaId = lote.etapaId;
    if (etapaId) {
      const etapa = this.etapasDisponibles.find(e => e.id === etapaId);
      if (etapa) {
        if (etapa.proyecto?.nombre) return etapa.proyecto.nombre;
        if (etapa.proyectoNombre) return etapa.proyectoNombre;
        const pId = etapa.proyecto?.id || etapa.proyectoId;
        if (pId) {
          const proyecto = this.proyectosDisponibles.find(p => p.id === pId);
          if (proyecto) return proyecto.nombre;
        }
      }
    }
    return 'Sin proyecto';
  }

  alCambiarProyecto(): void {
    this.nuevoLote.etapaId = null;
    if (this.nuevoLote.proyectoId) {
      const pId = Number(this.nuevoLote.proyectoId);
      this.etapasFiltradas = this.etapasDisponibles.filter(
        (e: Etapa) => e.proyecto?.id === pId || e.proyectoId === pId
      );
    } else {
      this.etapasFiltradas = this.etapasDisponibles;
    }
  }

  abrirModalCrear(): void {
    this.nuevoLote = {
      id: null,
      codigo: '',
      nombre: '',
      areaM2: null,
      proyectoId: null,
      etapaId: null,
      estadoId: 1,
      descripcion: ''
    };
    this.etapasFiltradas = [];
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarLote(): void {
    if (!this.nuevoLote.codigo || !this.nuevoLote.areaM2 || !this.nuevoLote.etapaId) return;

    this.guardando = true;

    const payload = {
      codigo: this.nuevoLote.codigo,
      nombre: this.nuevoLote.nombre,
      areaM2: Number(this.nuevoLote.areaM2),
      descripcion: this.nuevoLote.descripcion,
      etapaId: Number(this.nuevoLote.etapaId),
      estadoId: Number(this.nuevoLote.estadoId),
      activo: true,
      publicado: true
    };

    if (this.nuevoLote.id) {
      this.loteService.actualizarLote(this.nuevoLote.id, payload as Partial<Lote>).subscribe({
        next: () => {
          this.guardando = false;
          this.toastService.showSuccess('Lote actualizado exitosamente');
          this.cerrarModal();
          this.cargarLotes();
        },
        error: (err) => {
          console.error('Error al actualizar el lote:', err);
          this.toastService.showError('Error al actualizar el lote');
          this.guardando = false;
        }
      });
    } else {
      this.loteService.crearLote(payload as Partial<Lote>).subscribe({
        next: () => {
          this.guardando = false;
          this.toastService.showSuccess('Lote creado exitosamente');
          this.cerrarModal();
          this.cargarLotes();
        },
        error: (err) => {
          console.error('Error al guardar el lote:', err);
          this.toastService.showError('Error al crear el lote');
          this.guardando = false;
        }
      });
    }
  }

  actualizarEstado(lote: Lote): void {
    if (!lote.id) return;
    this.loteService.cambiarEstado(lote.id, Number(lote.estadoId)).subscribe({
      next: () => {
        console.log(`Estado de ${lote.codigo} actualizado`);
        this.toastService.showSuccess('Estado del lote actualizado');
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
        this.toastService.showError('Error al actualizar estado del lote');
      }
    });
  }

  toggleActivo(lote: Lote): void {
    if (!lote.id) return;
    this.loteService.toggleActivo(lote.id, lote.activo).subscribe({
      next: () => {
        console.log(`Visibilidad de ${lote.codigo} actualizada`);
        this.toastService.showSuccess('Visibilidad del lote actualizada');
        // Volver a aplicar filtros por si el switch afecta la vista filtrada por estado
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error al cambiar visibilidad:', err);
        this.toastService.showError('Error al cambiar visibilidad del lote');
        lote.activo = !lote.activo;
      }
    });
  }

  editarLote(lote: Lote): void {
    const etapaId = lote.etapaId;
    let proyectoId: number | null = null;
    
    if (etapaId) {
      const etapa = this.etapasDisponibles.find(e => e.id === etapaId);
      if (etapa) {
        const pId = etapa.proyecto?.id || etapa.proyectoId;
        if (pId !== undefined && pId !== null) {
          proyectoId = pId;
        }
      }
    }

    this.nuevoLote = {
      id: lote.id ?? null,
      codigo: lote.codigo,
      nombre: lote.nombre || '',
      areaM2: lote.areaM2,
      proyectoId: proyectoId,
      etapaId: etapaId ?? null,
      estadoId: lote.estadoId || 1,
      descripcion: lote.descripcion || ''
    };
    
    if (proyectoId) {
      const pId = Number(proyectoId);
      this.etapasFiltradas = this.etapasDisponibles.filter(
        (e: Etapa) => e.proyecto?.id === pId || e.proyectoId === pId
      );
    } else {
      this.etapasFiltradas = this.etapasDisponibles;
    }
    
    this.mostrarModal = true;
  }
}