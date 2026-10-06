import { Component, inject } from '@angular/core';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { BloqueZonasComponent } from './bloques/bloque-zonas.component';
import { BloqueCasasComponent } from './bloques/bloque-casas.component';
import { BloqueRecursosComponent } from './bloques/bloque-recursos.component';

/** Paso 5: zonas comunes con sus fotos, casa modelo y recursos del proyecto (videos, PDF, planos). */
@Component({
  selector: 'app-paso-contenido',
  standalone: true,
  imports: [BloqueZonasComponent, BloqueCasasComponent, BloqueRecursosComponent],
  styleUrl: './paso.scss',
  template: `
    <h2>Zonas comunes, casa modelo y recursos</h2>
    <p class="intro">Todo es opcional y se guarda al agregarlo. Lo que no llenes simplemente no aparece en el sitio.</p>

    <app-bloque-zonas />
    <app-bloque-casas />
    <app-bloque-recursos />

    <div class="acciones">
      <button type="button" class="secundario" (click)="asistente.anterior()">Atrás</button>
      <button type="button" class="primario" (click)="asistente.siguiente()">Continuar</button>
    </div>
  `
})
export class PasoContenidoComponent {
  readonly asistente = inject(AsistenteProyectoService);
}
