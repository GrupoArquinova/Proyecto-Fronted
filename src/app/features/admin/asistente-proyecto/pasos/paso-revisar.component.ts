import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { ProyectoService } from '../../../../core/services/proyecto.service';
import { ToastService } from '../../../../core/services/toast.service';
import { estadoDeLote } from '../../../../core/utils/lotes';

/** Paso 6: resumen de lo creado, avisos de lo que falta y publicación en el sitio. */
@Component({
  selector: 'app-paso-revisar',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './paso.scss',
  template: `
    @if (proyecto(); as p) {
      <h2>Revisar y publicar</h2>
      <p class="intro">Así quedó <strong>{{ p.nombre }}</strong>. Un proyecto sin publicar no aparece en el sitio; puedes publicarlo ahora o más tarde.</p>

      <ul class="resumen">
        <li><span class="cifra">{{ asistente.etapas().length }}</span> etapas</li>
        <li><span class="cifra">{{ asistente.lotes().length }}</span> lotes
          <small>{{ conteo().disponible }} disponibles · {{ conteo().reservado }} reservados · {{ conteo().vendido }} vendidos</small></li>
        <li><span class="cifra">{{ asistente.zonas().length }}</span> zonas comunes <small>{{ fotosZonas() }} fotos</small></li>
        <li><span class="cifra">{{ asistente.casas().length }}</span> casas modelo</li>
        <li><span class="cifra">{{ asistente.recursos().length }}</span> recursos <small>videos, PDF y más</small></li>
      </ul>

      @if (avisos().length > 0) {
        <div class="avisos" role="note">
          <strong>Antes de publicar, ten en cuenta:</strong>
          <ul>@for (a of avisos(); track a) { <li>{{ a }}</li> }</ul>
        </div>
      }

      @if (publicadoAhora()) {
        <div class="exito" role="status">
          <h3>Proyecto publicado</h3>
          <p>Ya se puede ver en el sitio.</p>
          <div class="enlaces">
            <a [routerLink]="['/proyectos', p.id]" target="_blank" class="boton-link">Ver en el sitio</a>
            <a routerLink="/admin/proyectos" (click)="terminar()" class="boton-link claro">Ir a Proyectos</a>
            <button type="button" class="secundario" (click)="otroProyecto()">Crear otro proyecto</button>
          </div>
        </div>
      } @else {
        <div class="acciones">
          <button type="button" class="secundario" (click)="asistente.anterior()" [disabled]="guardando()">Atrás</button>
          <div class="grupo-botones">
            <button type="button" class="secundario" (click)="sinPublicar()" [disabled]="guardando()">Guardar sin publicar</button>
            <button type="button" class="primario" (click)="publicar()" [disabled]="guardando()">
              {{ guardando() ? 'Publicando...' : 'Publicar proyecto' }}
            </button>
          </div>
        </div>
      }

      @if (p.publicado && !publicadoAhora()) {
        <p class="ayuda">Este proyecto ya estaba publicado.</p>
      }
    }
  `,
  styles: [`
    .resumen { list-style: none; margin: 0 0 1.4rem; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.8rem; }
    .resumen li { padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; color: #475569; }
    .cifra { display: block; font-size: 1.9rem; font-weight: 800; color: #2c5953; line-height: 1.1; }
    .resumen small { display: block; margin-top: 0.3rem; color: #94a3b8; }
    .avisos { margin-bottom: 1.4rem; padding: 1rem 1.2rem; background: #fef9c3; border-radius: 10px; color: #854d0e; }
    .avisos ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
    .grupo-botones { display: flex; gap: 0.7rem; flex-wrap: wrap; }
    .exito { padding: 1.4rem; background: #e8f0ef; border-radius: 12px; }
    .exito h3 { margin: 0 0 0.3rem; color: #2c5953; }
    .exito p { margin: 0 0 1rem; color: #475569; }
    .enlaces { display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: center; }
    .boton-link { padding: 0.7rem 1.4rem; background: #2c5953; color: #fff; border-radius: 6px; font-weight: 600; text-decoration: none; }
    .boton-link.claro { background: #fff; color: #2c5953; border: 1px solid #2c5953; }
  `]
})
export class PasoRevisarComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private proyectoService = inject(ProyectoService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly proyecto = this.asistente.proyecto;
  readonly guardando = signal(false);
  readonly publicadoAhora = signal(false);

  readonly conteo = computed(() => {
    const total = { disponible: 0, reservado: 0, vendido: 0 };
    for (const lote of this.asistente.lotes()) {
      const clave = estadoDeLote(lote).clave;
      if (clave !== 'otro') total[clave]++;
    }
    return total;
  });

  readonly fotosZonas = computed(() =>
    this.asistente.zonas().reduce((suma, z) => suma + (z.imagenes?.length ?? 0), 0));

  /** Lo que probablemente falta, para que no se publique algo a medias sin darse cuenta. */
  readonly avisos = computed(() => {
    const avisos: string[] = [];
    if (!this.proyecto()?.imagenUrl) avisos.push('No tiene foto de portada.');
    if (!this.asistente.ubicacion()) avisos.push('No tiene ubicación registrada.');
    if (this.asistente.lotes().length === 0) avisos.push('No tiene lotes: la sección Lotes y Disponibilidad no aparecerá.');
    const sinFotos = this.asistente.zonas().filter(z => (z.imagenes?.length ?? 0) === 0).length;
    if (sinFotos > 0) avisos.push(`${sinFotos} ${sinFotos === 1 ? 'zona común no tiene' : 'zonas comunes no tienen'} fotos.`);
    return avisos;
  });

  publicar(): void {
    const p = this.proyecto();
    if (!p?.id) return;

    this.guardando.set(true);
    // El PUT del backend recibe el proyecto completo, así que se reenvía lo que ya tiene
    this.proyectoService.actualizarProyecto(p.id, {
      empresaId: p.empresaId, nombre: p.nombre, slug: p.slug, descripcion: p.descripcion,
      estadoProyecto: p.estadoProyecto, tipoRegistro: p.tipoRegistro, tipoProyecto: p.tipoProyecto,
      participacion: p.participacion, destacado: p.destacado,
      imagenUrl: p.imagenUrl, fechaLanzamiento: p.fechaLanzamiento, publicado: true
    }).subscribe({
      next: actualizado => {
        this.asistente.fijarProyecto(actualizado);
        this.publicadoAhora.set(true);
        this.guardando.set(false);
        this.toast.showSuccess('Proyecto publicado');
      },
      error: err => {
        console.error('Error al publicar el proyecto:', err);
        this.toast.showError('No se pudo publicar el proyecto. Inténtalo de nuevo.');
        this.guardando.set(false);
      }
    });
  }

  sinPublicar(): void {
    this.toast.showInfo('Proyecto guardado sin publicar. Puedes publicarlo desde Proyectos.');
    this.terminar();
    this.router.navigate(['/admin/proyectos']);
  }

  /** Termina el asistente: el borrador ya no hace falta. */
  terminar(): void {
    this.asistente.reiniciar();
  }

  otroProyecto(): void {
    this.terminar();
    this.publicadoAhora.set(false);
  }
}
