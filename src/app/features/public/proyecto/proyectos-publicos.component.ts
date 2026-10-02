import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoteService } from '../../../core/services/lote.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-proyectos-publicos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proyectos-publicos.component.html',
  styleUrl: './proyectos-publicos.component.scss'
})
export class ProyectosPublicosComponent implements OnInit {
  private loteService = inject(LoteService);
  listaProyectos: any[] = [];

  ngOnInit(): void {
    forkJoin({
      proyectos: this.loteService.obtenerProyectos(),
      lotes: this.loteService.obtenerLotes()
    }).subscribe({
      next: ({ proyectos, lotes }) => {
        this.listaProyectos = proyectos.map(proyecto => {
          const lotesDelProyecto = lotes.filter((lote: any) => 
            lote.proyectoId === proyecto.id || lote.proyecto?.id === proyecto.id
          );

          const totalLotes = lotesDelProyecto.length;
          
          const lotesDisponibles = lotesDelProyecto.filter((lote: any) => 
            lote.estado === 'DISPONIBLE' || lote.estadoId === 1 || lote.disponible === true
          ).length;

          return {
            ...proyecto,
            totalLotes: totalLotes,
            lotesDisponibles: lotesDisponibles > 0 ? lotesDisponibles : totalLotes,
            imagenUrl: (proyecto as any).imagenUrl || 'assets/images/default-project.jpg',
            estado: (proyecto as any).estado || 'EN VENTA',
            ubicacion: (proyecto as any).ubicacion || 'Colombia',
            descripcion: (proyecto as any).descripcion || 'Proyecto campestre diseñado para quienes buscan tranquilidad, naturaleza y alta plusvalía.'
          };
        });
      },
      error: (err) => {
        console.error('Error al cargar proyectos y lotes:', err);
      }
    });
  }
}