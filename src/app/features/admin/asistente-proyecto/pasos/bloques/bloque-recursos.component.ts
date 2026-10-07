import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsistenteProyectoService } from '../../asistente-proyecto.service';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { SubidaArchivoComponent } from '../../../../../shared/components/subida-archivo/subida-archivo.component';
import { Multimedia, TipoMultimedia } from '../../../../../core/models/multimedia.models';
import { TipoArchivo } from '../../../../../core/utils/archivos';

/** Qué tipo de archivo admite cada clase de recurso. */
const OPCIONES: { tipo: TipoMultimedia; etiqueta: string; archivos: TipoArchivo[] }[] = [
  { tipo: 'VIDEO', etiqueta: 'Video del proyecto', archivos: ['video'] },
  { tipo: 'PDF', etiqueta: 'PDF (brochure, ficha técnica)', archivos: ['pdf'] },
  { tipo: 'PLANO', etiqueta: 'Plano', archivos: ['imagen', 'pdf'] },
  { tipo: 'IMAGEN', etiqueta: 'Foto del carrusel de Bienvenida', archivos: ['imagen'] },
  { tipo: 'BENEFICIOS', etiqueta: 'Lámina de beneficios (una sola)', archivos: ['imagen'] },
  { tipo: 'RESPALDO', etiqueta: 'Lámina de respaldo (carrusel de Respaldo)', archivos: ['imagen'] },
  { tipo: 'MAPA', etiqueta: 'Imagen del mapa de ubicación (carrusel de Mapa)', archivos: ['imagen'] },
  { tipo: 'ZONAS_DESTACADAS', etiqueta: 'Imagen de zonas destacadas (vista aérea o plano con los botones de cada zona)', archivos: ['imagen'] },
  { tipo: 'PANORAMICA_360', etiqueta: 'Panorámica 360°', archivos: ['imagen'] }
];

@Component({
  selector: 'app-bloque-recursos',
  standalone: true,
  imports: [FormsModule, SubidaArchivoComponent],
  styleUrl: '../paso.scss',
  template: `
    <section class="bloque" aria-label="Videos, PDF y otros recursos">
      <h3>Videos, PDF y otros recursos</h3>
      <p class="nota">Archivos del proyecto: video, brochure en PDF, planos, fotos del carrusel de Bienvenida, la lámina de beneficios y panorámicas.</p>

      <div class="fila">
        <label>Tipo de recurso
          <select [ngModel]="tipo()" (ngModelChange)="tipo.set($event)">
            @for (o of opciones; track o.tipo) { <option [ngValue]="o.tipo">{{ o.etiqueta }}</option> }
          </select>
        </label>
        <label>Título <span class="opcional">(opcional)</span>
          <input type="text" [ngModel]="titulo()" (ngModelChange)="titulo.set($event)" placeholder="Video de presentación" maxlength="150" />
        </label>
      </div>

      <app-subida-archivo [etiqueta]="'Subir ' + etiquetaTipo().toLowerCase()" [tipos]="tiposArchivo()" [limpiarAlSubir]="true"
                          (subido)="agregar($event.url, $event.nombre)" />

      <ul class="lista">
        @for (r of asistente.recursos(); track r.id) {
          <li>
            <span class="tipo">{{ nombreTipo(r.tipo) }}</span>
            <a [href]="r.url" target="_blank" rel="noopener">{{ r.titulo || r.nombreArchivo || 'Ver archivo' }}</a>
            <button type="button" class="quitar" (click)="eliminar(r)">Quitar</button>
          </li>
        } @empty {
          <li class="vacio">Todavía no hay recursos.</li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .bloque { margin-bottom: 1.4rem; padding: 1.2rem 1.3rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    h3 { margin: 0 0 0.3rem; font-size: 1.05rem; color: #1e293b; }
    .nota { margin: 0 0 1rem; color: #64748b; font-size: 0.88rem; }
    .fila { margin-bottom: 1rem; }
    .lista { list-style: none; margin: 1.1rem 0 0; padding: 0; display: grid; gap: 0.5rem; }
    .lista li { display: flex; align-items: center; gap: 0.8rem; padding: 0.6rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
    .tipo { padding: 0.15rem 0.6rem; background: #e8f0ef; color: #2c5953; border-radius: 999px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .lista a { flex: 1; min-width: 0; color: #2c5953; font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .quitar { padding: 0; background: none; border: none; color: #dc2626; font-size: 0.85rem; font-weight: 600; }
    .vacio { justify-content: center; color: #94a3b8; border-style: dashed !important; }
  `]
})
export class BloqueRecursosComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private multimediaService = inject(MultimediaService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  readonly opciones = OPCIONES;
  readonly tipo = signal<TipoMultimedia>('VIDEO');
  readonly titulo = signal('');

  readonly tiposArchivo = computed<TipoArchivo[]>(() => OPCIONES.find(o => o.tipo === this.tipo())?.archivos ?? ['imagen']);
  readonly etiquetaTipo = computed(() => OPCIONES.find(o => o.tipo === this.tipo())?.etiqueta ?? '');

  nombreTipo(tipo: TipoMultimedia): string {
    return OPCIONES.find(o => o.tipo === tipo)?.etiqueta.split(' (')[0] ?? tipo;
  }

  agregar(url: string, nombreArchivo: string): void {
    const proyectoId = this.asistente.proyectoId();
    if (proyectoId == null) return;

    const recurso: Partial<Multimedia> = {
      proyectoId,
      tipo: this.tipo(),
      titulo: this.titulo().trim() || undefined,
      url,
      nombreArchivo,
      orden: Math.max(0, ...this.asistente.recursos().map(r => r.orden ?? 0)) + 1,
      portada: false,
      publicado: true,
      activo: true
    };

    // La lámina de beneficios es una sola por proyecto: la nueva reemplaza a la anterior
    const anterior = recurso.tipo === 'BENEFICIOS' ? this.asistente.recursos().find(r => r.tipo === 'BENEFICIOS') : undefined;

    this.multimediaService.crearMultimedia(recurso).subscribe({
      next: creado => {
        this.asistente.recursos.update(l => [...l.filter(r => r.id !== anterior?.id), creado]);
        this.titulo.set('');
        if (anterior?.id != null) this.multimediaService.eliminarMultimedia(anterior.id).subscribe({ error: () => undefined });
      },
      error: err => {
        console.error('Error al guardar el recurso:', err);
        this.toast.showError('El archivo se subió pero no se pudo guardar en el proyecto.');
      }
    });
  }

  async eliminar(recurso: Multimedia): Promise<void> {
    if (recurso.id == null) return;
    const ok = await this.confirm.open({ title: 'Quitar recurso', message: '¿Quitar este archivo del proyecto?', confirmText: 'Sí, quitar' });
    if (!ok) return;
    this.multimediaService.eliminarMultimedia(recurso.id).subscribe({
      next: () => this.asistente.recursos.update(l => l.filter(r => r.id !== recurso.id)),
      error: () => this.toast.showError('No se pudo quitar el recurso.')
    });
  }
}
