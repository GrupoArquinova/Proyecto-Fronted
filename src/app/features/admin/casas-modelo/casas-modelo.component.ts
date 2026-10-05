import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto } from '../../../core/models/proyecto.models';
import { CasaModelo } from '../../../core/models/casa-modelo.models';
import { CasaModeloService } from '../../../core/services/casa-modelo.service';
import { ProyectoService } from '../../../core/services/proyecto.service';

@Component({
  selector: 'app-casas-modelo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './casas-modelo.component.html',
  styleUrls: ['./casas-modelo.component.scss']
})
export class CasasModeloComponent implements OnInit {
  private casaModeloService = inject(CasaModeloService);
  private proyectoService = inject(ProyectoService);

  listaCasas: CasaModelo[] = [];
  listaProyectos: Proyecto[] = [];
  modalAbierto = false;
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
    this.modalAbierto = true;
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
    if (confirm('¿Estás seguro de eliminar esta casa modelo?')) {
      this.casaModeloService.eliminar(id).subscribe({
        next: () => this.cargarCasas(),
        error: (err) => console.error('Error al eliminar casa modelo', err)
      });
    }
  }
}