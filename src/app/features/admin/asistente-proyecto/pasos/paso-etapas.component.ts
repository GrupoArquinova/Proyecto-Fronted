import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { EtapaService } from '../../../../core/services/etapa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { Etapa } from '../../../../core/models/etapa.models';

@Component({
  selector: 'app-paso-etapas',
  standalone: true,
  imports: [ReactiveFormsModule],
  styleUrl: './paso.scss',
  template: `
    <h2>Etapas</h2>
    <p class="intro">Las etapas agrupan los lotes (por ejemplo "Etapa 1 - El Roble"). Se guardan al agregarlas. Si el proyecto no se divide, crea una sola.</p>

    <form [formGroup]="form" (ngSubmit)="agregar()" class="agregar" novalidate>
      <label class="crece">Nombre de la etapa
        <input type="text" formControlName="nombre" placeholder="Etapa 1 - El Roble"
               [class.invalido]="form.controls.nombre.invalid && form.controls.nombre.touched" />
      </label>
      <label class="corto">Orden
        <input type="number" min="1" formControlName="orden" />
      </label>
      <button type="submit" class="primario" [disabled]="guardando()">{{ guardando() ? 'Agregando...' : 'Agregar' }}</button>
    </form>
    @if (duplicada()) { <small class="error">Ya hay una etapa con ese nombre en este proyecto.</small> }

    <ul class="lista" aria-label="Etapas del proyecto">
      @for (etapa of etapas(); track etapa.id) {
        <li>
          <span class="orden">{{ etapa.orden }}</span>
          <span class="nombre">{{ etapa.nombre }}</span>
          <button type="button" class="quitar" (click)="eliminar(etapa)" [attr.aria-label]="'Eliminar ' + etapa.nombre">Eliminar</button>
        </li>
      } @empty {
        <li class="vacia">Todavía no hay etapas. Agrega la primera.</li>
      }
    </ul>

    <div class="acciones">
      <button type="button" class="secundario" (click)="asistente.anterior()">Atrás</button>
      <button type="button" class="primario" [disabled]="etapas().length === 0" (click)="asistente.siguiente()">Continuar</button>
    </div>
  `,
  styles: [`
    .agregar { grid-template-columns: 1fr auto auto; align-items: end; margin-bottom: 0.4rem; }
    .crece { min-width: 0; }
    .corto { width: 90px; }
    .lista { list-style: none; margin: 1.2rem 0 0; padding: 0; display: grid; gap: 0.5rem; }
    .lista li { display: flex; align-items: center; gap: 0.9rem; padding: 0.7rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
    .orden { display: grid; place-items: center; width: 1.9rem; height: 1.9rem; background: #e8f0ef; color: #2c5953; border-radius: 50%; font-weight: 700; font-size: 0.85rem; }
    .nombre { flex: 1; font-weight: 600; color: #1e293b; }
    .quitar { padding: 0.3rem 0.7rem; background: none; border: none; color: #dc2626; font-size: 0.85rem; }
    .quitar:hover { text-decoration: underline; }
    .vacia { justify-content: center; color: #94a3b8; border-style: dashed !important; }
    @media (max-width: 640px) { .agregar { grid-template-columns: 1fr; } .corto { width: 100%; } }
  `]
})
export class PasoEtapasComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private etapaService = inject(EtapaService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private fb = inject(FormBuilder);

  readonly etapas = this.asistente.etapas;
  readonly guardando = signal(false);
  readonly duplicada = signal(false);

  /** Siguiente número de orden libre. */
  private proximoOrden = computed(() => Math.max(0, ...this.etapas().map(e => e.orden ?? 0)) + 1);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    orden: [1, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.form.controls.orden.setValue(this.proximoOrden());
  }

  agregar(): void {
    const proyectoId = this.asistente.proyectoId();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.nombre.trim() || proyectoId == null) {
      this.form.markAllAsTouched();
      return;
    }

    this.duplicada.set(false);
    this.guardando.set(true);
    this.etapaService.crearEtapa({ proyectoId, nombre: v.nombre.trim(), orden: v.orden, activo: true }).subscribe({
      next: etapa => {
        this.etapas.update(lista => [...lista, etapa].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
        this.form.reset({ nombre: '', orden: this.proximoOrden() });
        this.guardando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) {
          this.duplicada.set(true);
        } else {
          console.error('Error al crear la etapa:', err);
          this.toast.showError('No se pudo crear la etapa. Inténtalo de nuevo.');
        }
      }
    });
  }

  async eliminar(etapa: Etapa): Promise<void> {
    if (etapa.id == null) return;
    const confirmado = await this.confirm.open({
      title: 'Eliminar etapa',
      message: `¿Eliminar la etapa "${etapa.nombre}"?`,
      confirmText: 'Sí, eliminar'
    });
    if (!confirmado) return;

    this.etapaService.eliminarEtapa(etapa.id).subscribe({
      next: () => this.etapas.update(lista => lista.filter(e => e.id !== etapa.id)),
      error: err => {
        console.error('Error al eliminar la etapa:', err);
        this.toast.showError('No se pudo eliminar la etapa.');
      }
    });
  }
}
