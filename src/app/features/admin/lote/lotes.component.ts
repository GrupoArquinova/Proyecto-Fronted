import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lote, EstadoLote, Etapa } from '../../../core/models/lote.models';
import { LoteService, Proyecto } from '../../../core/services/lote.service';

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lotes.component.html',
  styleUrls: ['./lotes.component.scss']
})
export class LotesComponent implements OnInit {
  private loteService = inject(LoteService);

  lotes: Lote[] = [];
  proyectosDisponibles: Proyecto[] = [];
  etapasDisponibles: Etapa[] = [];
  etapasFiltradas: Etapa[] = [];
  
  cargando: boolean = false;
  mostrarModal: boolean = false;
  guardando: boolean = false;

  estadosDisponibles: EstadoLote[] = [
    { id: 1, nombre: 'Disponible' },
    { id: 2, nombre: 'Reservado' },
    { id: 3, nombre: 'Vendido' }
  ];

  // Modelo temporal para el formulario de creación/edición
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
      next: (data: any[]) => {
        // Mapear campos planos del DTO del backend
        this.lotes = data.map(lote => ({
          ...lote,
          // Asegurar que estadoId siempre tenga un valor
          estadoId: lote.estadoId ?? 1,
          activo: lote.activo ?? true
        }));
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.cargando = false;
      }
    });
  }

  cargarProyectos(): void {
    this.loteService.obtenerProyectos().subscribe({
      next: (data) => (this.proyectosDisponibles = data),
      error: (err) => console.error('Error al cargar proyectos:', err)
    });
  }

  cargarEtapas(): void {
    this.loteService.obtenerEtapas().subscribe({
      next: (data) => {
        this.etapasDisponibles = data;
        this.etapasFiltradas = data;
      },
      error: (err) => console.error('Error al cargar etapas:', err)
    });
  }

  /**
   * Busca el nombre del proyecto al que pertenece el lote,
   * usando la etapa como puente (Lote -> Etapa -> Proyecto).
   */
  obtenerNombreProyecto(lote: any): string {
    // Primero: si el backend envía proyectoNombre directamente
    if (lote.proyectoNombre) return lote.proyectoNombre;

    // Segundo: buscar la etapa en la lista descargada y extraer el proyecto
    const etapaId = lote.etapaId;
    if (etapaId) {
      const etapa: any = this.etapasDisponibles.find(e => e.id === etapaId);
      if (etapa) {
        // Si la etapa tiene proyecto con nombre
        if (etapa.proyecto?.nombre) return etapa.proyecto.nombre;
        // Si la etapa tiene proyectoNombre directamente
        if (etapa.proyectoNombre) return etapa.proyectoNombre;
        // Si la etapa tiene proyectoId, buscamos en la lista de proyectos
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
        (e: any) => e.proyecto?.id === pId || e.proyectoId === pId
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
      // Actualizar lote existente
      this.loteService.actualizarLote(this.nuevoLote.id, payload as any).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModal();
          this.cargarLotes();
        },
        error: (err) => {
          console.error('Error al actualizar el lote:', err);
          this.guardando = false;
        }
      });
    } else {
      // Crear nuevo lote
      this.loteService.crearLote(payload as any).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModal();
          this.cargarLotes();
        },
        error: (err) => {
          console.error('Error al guardar el lote:', err);
          this.guardando = false;
        }
      });
    }
  }

  actualizarEstado(lote: Lote): void {
    if (!lote.id) return;
    this.loteService.cambiarEstado(lote.id, Number(lote.estadoId)).subscribe({
      next: () => console.log(`Estado de ${lote.codigo} actualizado`),
      error: (err) => console.error('Error al actualizar estado:', err)
    });
  }

  toggleActivo(lote: Lote): void {
    if (!lote.id) return;
    this.loteService.toggleActivo(lote.id, lote.activo).subscribe({
      next: () => console.log(`Visibilidad de ${lote.codigo} actualizada`),
      error: (err) => {
        console.error('Error al cambiar visibilidad:', err);
        lote.activo = !lote.activo;
      }
    });
  }

  editarLote(lote: any): void {
    const etapaId = lote.etapaId;
    let proyectoId: number | null = null;
    
    if (etapaId) {
      const etapa: any = this.etapasDisponibles.find(e => e.id === etapaId);
      if (etapa) {
        const pId = etapa.proyecto?.id || etapa.proyectoId;
        if (pId !== undefined && pId !== null) {
          proyectoId = pId;
        }
      }
    }

    this.nuevoLote = {
      id: lote.id,
      codigo: lote.codigo,
      nombre: lote.nombre || '',
      areaM2: lote.areaM2,
      proyectoId: proyectoId,
      etapaId: etapaId,
      estadoId: lote.estadoId || 1,
      descripcion: lote.descripcion || ''
    };
    
    // Filtrar las etapas correspondientes al proyecto sin resetear etapaId
    if (proyectoId) {
      const pId = Number(proyectoId);
      this.etapasFiltradas = this.etapasDisponibles.filter(
        (e: any) => e.proyecto?.id === pId || e.proyectoId === pId
      );
    } else {
      this.etapasFiltradas = this.etapasDisponibles;
    }
    
    this.mostrarModal = true;
  }
}