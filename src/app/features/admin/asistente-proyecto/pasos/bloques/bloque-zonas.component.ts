import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteProyectoService } from '../../asistente-proyecto.service';
import { ZonaComunService } from '../../../../../core/services/zona-comun.service';
import { ZonaComunImagenService } from '../../../../../core/services/zona-comun-imagen.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { SubidaArchivoComponent } from '../../../../../shared/components/subida-archivo/subida-archivo.component';
import { ZonaComun } from '../../../../../core/models/zona-comun.models';
import { ZonaComunImagen } from '../../../../../core/models/zona-comun-imagen.models';

@Component({
  selector: 'app-bloque-zonas',
  standalone: true,
  imports: [ReactiveFormsModule, SubidaArchivoComponent],
  styleUrl: '../paso.scss',
  template: `
    <section class="bloque" aria-label="Zonas comunes">
      <h3>Zonas comunes</h3>
      <p class="nota">Piscina, salón social, senderos… Cada zona puede tener varias fotos; la primera queda como principal.</p>

      <form [formGroup]="form" (ngSubmit)="agregar()" class="agregar" novalidate>
        <label>Nombre
          <input type="text" formControlName="nombre" placeholder="Piscina y zonas húmedas" maxlength="150"
                 [class.invalido]="form.controls.nombre.invalid && form.controls.nombre.touched" />
        </label>
        <label>Descripción <span class="opcional">(opcional)</span>
          <input type="text" formControlName="descripcion" placeholder="Piscina para adultos y niños" />
        </label>
        <button type="submit" class="secundario" [disabled]="guardando()">{{ guardando() ? 'Agregando...' : 'Agregar zona' }}</button>
      </form>
      @if (duplicada()) { <small class="error">Ya hay una zona con ese nombre en este proyecto.</small> }

      <ul class="tarjetas">
        @for (zona of asistente.zonas(); track zona.id) {
          <li class="tarjeta">
            <div class="tarjeta-cabecera">
              <div>
                <strong>{{ zona.nombre }}</strong>
                @if (zona.descripcion) { <span class="sub">{{ zona.descripcion }}</span> }
              </div>
              <button type="button" class="quitar" (click)="eliminar(zona)" [attr.aria-label]="'Eliminar ' + zona.nombre">Eliminar zona</button>
            </div>

            <ul class="fotos">
              @for (foto of zona.imagenes ?? []; track foto.id) {
                <li [class.principal]="foto.esPrincipal">
                  <img [src]="foto.imagenUrl" [alt]="foto.titulo || zona.nombre" />
                  @if (foto.esPrincipal) { <span class="etiqueta">Principal</span> }
                  <div class="foto-acciones">
                    @if (!foto.esPrincipal) { <button type="button" (click)="hacerPrincipal(zona, foto)">Principal</button> }
                    <button type="button" (click)="quitarFoto(zona, foto)">Quitar</button>
                  </div>
                </li>
              }
            </ul>

            <app-subida-archivo etiqueta="Agregar foto" [tipos]="['imagen']" [limpiarAlSubir]="true"
                                (subido)="agregarFoto(zona, $event.url)" />
          </li>
        } @empty {
          <li class="vacio">Todavía no hay zonas comunes.</li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .bloque { margin-bottom: 1.4rem; padding: 1.2rem 1.3rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    h3 { margin: 0 0 0.3rem; font-size: 1.05rem; color: #1e293b; }
    .nota { margin: 0 0 1rem; color: #64748b; font-size: 0.88rem; }
    .agregar { grid-template-columns: 1fr 1fr auto; align-items: end; }
    .tarjetas { list-style: none; margin: 1.1rem 0 0; padding: 0; display: grid; gap: 0.8rem; }
    .tarjeta { padding: 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; display: grid; gap: 0.8rem; }
    .tarjeta-cabecera { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
    .sub { display: block; font-size: 0.85rem; color: #64748b; }
    .quitar { padding: 0; background: none; border: none; color: #dc2626; font-size: 0.82rem; font-weight: 600; white-space: nowrap; }
    .fotos { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .fotos li { position: relative; width: 120px; border: 2px solid transparent; border-radius: 10px; overflow: hidden; }
    .fotos li.principal { border-color: #2c5953; }
    .fotos img { display: block; width: 100%; height: 86px; object-fit: cover; }
    .etiqueta { position: absolute; top: 4px; left: 4px; padding: 0.05rem 0.4rem; background: #2c5953; color: #fff; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
    .foto-acciones { display: flex; justify-content: space-between; padding: 0.2rem 0.3rem; background: #f1f5f9; }
    .foto-acciones button { padding: 0.1rem 0.2rem; background: none; border: none; color: #2c5953; font-size: 0.75rem; font-weight: 600; }
    .foto-acciones button:last-child { color: #dc2626; }
    .vacio { text-align: center; color: #94a3b8; padding: 0.4rem; }
    @media (max-width: 760px) { .agregar { grid-template-columns: 1fr; } }
  `]
})
export class BloqueZonasComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private zonaService = inject(ZonaComunService);
  private imagenService = inject(ZonaComunImagenService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly duplicada = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['']
  });

  agregar(): void {
    const proyectoId = this.asistente.proyectoId();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.nombre.trim() || proyectoId == null) {
      this.form.markAllAsTouched();
      return;
    }

    this.duplicada.set(false);
    this.guardando.set(true);
    const zona: ZonaComun = { proyectoId, nombre: v.nombre.trim(), descripcion: v.descripcion.trim(), publicado: true, activo: true };
    this.zonaService.crear(zona).subscribe({
      next: creada => {
        this.asistente.zonas.update(l => [...l, { ...creada, imagenes: creada.imagenes ?? [] }]);
        this.form.reset({ nombre: '', descripcion: '' });
        this.guardando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) this.duplicada.set(true);
        else this.toast.showError('No se pudo crear la zona. Inténtalo de nuevo.');
      }
    });
  }

  async eliminar(zona: ZonaComun): Promise<void> {
    if (zona.id == null) return;
    const ok = await this.confirm.open({ title: 'Eliminar zona común', message: `¿Eliminar "${zona.nombre}" y sus fotos?`, confirmText: 'Sí, eliminar' });
    if (!ok) return;
    this.zonaService.eliminar(zona.id).subscribe({
      next: () => this.asistente.zonas.update(l => l.filter(z => z.id !== zona.id)),
      error: () => this.toast.showError('No se pudo eliminar la zona.')
    });
  }

  agregarFoto(zona: ZonaComun, url: string): void {
    if (zona.id == null) return;
    const fotos = zona.imagenes ?? [];
    const imagen: ZonaComunImagen = {
      zonaComunId: zona.id,
      imagenUrl: url,
      orden: Math.max(0, ...fotos.map(f => f.orden ?? 0)) + 1,
      // La primera foto de la zona queda como principal
      esPrincipal: fotos.length === 0
    };
    this.imagenService.crear(imagen).subscribe({
      next: creada => this.actualizarFotos(zona.id!, lista => [...lista, creada]),
      error: err => {
        console.error('Error al guardar la foto:', err);
        this.toast.showError('La foto se subió pero no se pudo asociar a la zona.');
      }
    });
  }

  hacerPrincipal(zona: ZonaComun, foto: ZonaComunImagen): void {
    if (foto.id == null || zona.id == null) return;
    this.imagenService.marcarComoPrincipal(foto.id).subscribe({
      next: () => this.actualizarFotos(zona.id!, lista => lista.map(f => ({ ...f, esPrincipal: f.id === foto.id }))),
      error: () => this.toast.showError('No se pudo cambiar la foto principal.')
    });
  }

  quitarFoto(zona: ZonaComun, foto: ZonaComunImagen): void {
    if (foto.id == null || zona.id == null) return;
    this.imagenService.eliminar(foto.id).subscribe({
      next: () => this.actualizarFotos(zona.id!, lista => lista.filter(f => f.id !== foto.id)),
      error: () => this.toast.showError('No se pudo quitar la foto.')
    });
  }

  private actualizarFotos(zonaId: number, cambio: (lista: ZonaComunImagen[]) => ZonaComunImagen[]): void {
    this.asistente.zonas.update(zonas => zonas.map(z => (z.id === zonaId ? { ...z, imagenes: cambio(z.imagenes ?? []) } : z)));
  }
}
