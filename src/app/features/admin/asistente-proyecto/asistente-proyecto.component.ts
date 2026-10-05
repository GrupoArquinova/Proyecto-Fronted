import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsistenteProyectoService, PASOS, PasoAsistente } from './asistente-proyecto.service';
import { PasoProyectoComponent } from './pasos/paso-proyecto.component';
import { PasoUbicacionComponent } from './pasos/paso-ubicacion.component';
import { PasoEtapasComponent } from './pasos/paso-etapas.component';

/**
 * Asistente para crear un proyecto completo en un solo flujo (proyecto, ubicación, etapas y, en las
 * siguientes fases, lotes, zonas comunes, casa modelo y publicación). Cada paso guarda al continuar.
 */
@Component({
  selector: 'app-asistente-proyecto',
  standalone: true,
  imports: [RouterLink, PasoProyectoComponent, PasoUbicacionComponent, PasoEtapasComponent],
  providers: [AsistenteProyectoService],
  templateUrl: './asistente-proyecto.component.html',
  styleUrl: './asistente-proyecto.component.scss'
})
export class AsistenteProyectoComponent implements OnInit {
  readonly asistente = inject(AsistenteProyectoService);
  readonly pasos = PASOS;

  readonly cargando = signal(true);
  /** Nombre del borrador recuperado, para avisar a quién abre el asistente. */
  readonly borradorRecuperado = signal<string | null>(null);

  ngOnInit(): void {
    this.asistente.retomarBorrador().subscribe({
      next: hayBorrador => {
        if (hayBorrador) this.borradorRecuperado.set(this.asistente.proyecto()?.nombre ?? '');
        this.cargando.set(false);
      },
      // Si el borrador ya no existe en el servidor, se descarta y se empieza de cero
      error: () => {
        this.asistente.reiniciar();
        this.cargando.set(false);
      }
    });
  }

  empezarDeNuevo(): void {
    this.asistente.reiniciar();
    this.borradorRecuperado.set(null);
  }

  estado(numero: PasoAsistente): 'actual' | 'completo' | 'pendiente' {
    if (numero === this.asistente.paso()) return 'actual';
    return numero < this.asistente.pasoMaximo() || (numero < this.asistente.paso()) ? 'completo' : 'pendiente';
  }

  puedeIr(numero: PasoAsistente): boolean {
    return numero <= this.asistente.pasoMaximo() && (numero === 1 || this.asistente.tieneProyecto());
  }
}
