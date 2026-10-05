import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { ProyectoPublico } from '../../../core/models/proyecto.models';

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

  ngOnInit(): void {
    this.proyectoService.obtenerCatalogoPublico().subscribe({
      next: ({ proyectos }) => (this.listaProyectos = proyectos),
      error: (err) => console.error('Error al cargar proyectos y lotes:', err)
    });
  }
}
