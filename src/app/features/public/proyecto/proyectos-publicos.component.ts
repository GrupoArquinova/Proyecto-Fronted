import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { ProyectoPublico, ETAPAS_PROYECTO, TIPOS_PROYECTO } from '../../../core/models/proyecto.models';

@Component({
  selector: 'app-proyectos-publicos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proyectos-publicos.component.html',
  styleUrl: './proyectos-publicos.component.scss'
})
export class ProyectosPublicosComponent implements OnInit {
  private proyectoService = inject(ProyectoService);
  listaProyectos: ProyectoPublico[] = [];

  // Filtros (RF12): solo se ofrecen los que tienen datos para elegir
  filtroMunicipio = '';
  filtroTipo = '';
  filtroEtapa = '';

  get municipios(): string[] {
    return [...new Set(this.listaProyectos.map(p => p.municipio).filter(Boolean))].sort();
  }

  get tipos() {
    return TIPOS_PROYECTO.filter(t => this.listaProyectos.some(p => p.tipoProyecto === t.valor));
  }

  get etapas() {
    return ETAPAS_PROYECTO.filter(e => this.listaProyectos.some(p => p.estadoProyecto === e.valor));
  }

  get hayFiltros(): boolean {
    return this.municipios.length > 1 || this.tipos.length > 1 || this.etapas.length > 1;
  }

  get filtrando(): boolean {
    return !!(this.filtroMunicipio || this.filtroTipo || this.filtroEtapa);
  }

  get proyectosFiltrados(): ProyectoPublico[] {
    return this.listaProyectos.filter(p =>
      (!this.filtroMunicipio || p.municipio === this.filtroMunicipio)
      && (!this.filtroTipo || p.tipoProyecto === this.filtroTipo)
      && (!this.filtroEtapa || p.estadoProyecto === this.filtroEtapa));
  }

  limpiarFiltros(): void {
    this.filtroMunicipio = '';
    this.filtroTipo = '';
    this.filtroEtapa = '';
  }

  valorDe(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  ngOnInit(): void {
    this.proyectoService.obtenerCatalogoPublico().subscribe({
      next: ({ proyectos }) => (this.listaProyectos = proyectos),
      error: (err) => console.error('Error al cargar proyectos y lotes:', err)
    });
  }
}
