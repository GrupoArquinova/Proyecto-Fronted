import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteProyectoService } from '../../asistente-proyecto.service';
import { CasaModeloService } from '../../../../../core/services/casa-modelo.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { SubidaArchivoComponent } from '../../../../../shared/components/subida-archivo/subida-archivo.component';
import { CasaModelo } from '../../../../../core/models/casa-modelo.models';

@Component({
  selector: 'app-bloque-casas',
  standalone: true,
  imports: [ReactiveFormsModule, SubidaArchivoComponent],
  styleUrl: '../paso.scss',
  template: `
    <section class="bloque" aria-label="Tipologías">
      <h3>Tipologías</h3>
      <p class="nota">Opcional. Si el proyecto tiene una casa de muestra, agrégala con su plano y su tour virtual.</p>

      <form [formGroup]="form" (ngSubmit)="agregar()" novalidate>
        <div class="fila">
          <label>Nombre
            <input type="text" formControlName="nombre" placeholder="Casa Azul" maxlength="150"
                   [class.invalido]="form.controls.nombre.invalid && form.controls.nombre.touched" />
          </label>
          <label>Área construida (m²) <span class="opcional">(opcional)</span>
            <input type="number" min="1" step="any" formControlName="area" placeholder="128.5" />
          </label>
        </div>
        <div class="fila">
          <label>Habitaciones <span class="opcional">(opcional)</span>
            <input type="number" min="1" formControlName="habitaciones" />
          </label>
          <label>Baños <span class="opcional">(opcional)</span>
            <input type="number" min="1" formControlName="banos" />
          </label>
        </div>
        <label>Descripción <span class="opcional">(opcional)</span>
          <textarea formControlName="descripcion" placeholder="Casa de 2 niveles con diseño moderno"></textarea>
        </label>
        <label>Enlace del tour virtual <span class="opcional">(opcional)</span>
          <input type="text" formControlName="tourVirtualUrl" placeholder="https://my.matterport.com/show/?m=…" />
          <small class="ayuda">Enlace de Matterport, Kuula, YouTube u otro. Se muestra incrustado en el sitio.</small>
        </label>
        <app-subida-archivo etiqueta="Plano de la casa" [tipos]="['imagen', 'pdf']" [(url)]="planoUrl" />

        <div><button type="submit" class="secundario" [disabled]="guardando()">{{ guardando() ? 'Agregando...' : 'Agregar casa modelo' }}</button></div>
        @if (duplicada()) { <small class="error">Ya hay una tipología con ese nombre en este proyecto.</small> }
      </form>

      <ul class="lista">
        @for (casa of asistente.casas(); track casa.id) {
          <li>
            <div>
              <strong>{{ casa.nombre }}</strong>
              <span class="sub">
                {{ casa.areaConstruidaM2 ? casa.areaConstruidaM2 + ' m² · ' : '' }}{{ casa.numeroHabitaciones ? casa.numeroHabitaciones + ' hab. · ' : '' }}{{ casa.numeroBanos ? casa.numeroBanos + ' baños' : '' }}
              </span>
            </div>
            <button type="button" class="quitar" (click)="eliminar(casa)">Eliminar</button>
          </li>
        } @empty {
          <li class="vacio">Sin tipologías.</li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .bloque { margin-bottom: 1.4rem; padding: 1.2rem 1.3rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    h3 { margin: 0 0 0.3rem; font-size: 1.05rem; color: #1e293b; }
    .nota { margin: 0 0 1rem; color: #64748b; font-size: 0.88rem; }
    .lista { list-style: none; margin: 1.1rem 0 0; padding: 0; display: grid; gap: 0.5rem; }
    .lista li { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.7rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
    .sub { display: block; font-size: 0.82rem; color: #64748b; }
    .quitar { padding: 0; background: none; border: none; color: #dc2626; font-size: 0.85rem; font-weight: 600; }
    .vacio { justify-content: center !important; color: #94a3b8; border-style: dashed !important; }
  `]
})
export class BloqueCasasComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private casaService = inject(CasaModeloService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly duplicada = signal(false);
  readonly planoUrl = signal('');

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    area: [null as number | null, Validators.min(1)],
    habitaciones: [null as number | null, Validators.min(1)],
    banos: [null as number | null, Validators.min(1)],
    descripcion: [''],
    tourVirtualUrl: ['']
  });

  agregar(): void {
    const proyectoId = this.asistente.proyectoId();
    const v = this.form.getRawValue();
    if (this.form.invalid || !(v.nombre ?? '').trim() || proyectoId == null) {
      this.form.markAllAsTouched();
      return;
    }

    const casa: CasaModelo = {
      proyectoId,
      nombre: (v.nombre ?? '').trim(),
      descripcion: v.descripcion?.trim() || undefined,
      areaConstruidaM2: v.area ?? undefined,
      numeroHabitaciones: v.habitaciones ?? undefined,
      numeroBanos: v.banos ?? undefined,
      tourVirtualUrl: v.tourVirtualUrl?.trim() || undefined,
      planoUrl: this.planoUrl() || undefined,
      publicado: true,
      activo: true
    };

    this.duplicada.set(false);
    this.guardando.set(true);
    this.casaService.crear(casa).subscribe({
      next: creada => {
        this.asistente.casas.update(l => [...l, creada]);
        this.form.reset();
        this.planoUrl.set('');
        this.guardando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) this.duplicada.set(true);
        else this.toast.showError('No se pudo crear la tipología. Inténtalo de nuevo.');
      }
    });
  }

  async eliminar(casa: CasaModelo): Promise<void> {
    if (casa.id == null) return;
    const ok = await this.confirm.open({ title: 'Eliminar tipología', message: `¿Eliminar "${casa.nombre}"?`, confirmText: 'Sí, eliminar' });
    if (!ok) return;
    this.casaService.eliminar(casa.id).subscribe({
      next: () => this.asistente.casas.update(l => l.filter(c => c.id !== casa.id)),
      error: () => this.toast.showError('No se pudo eliminar la tipología.')
    });
  }
}
