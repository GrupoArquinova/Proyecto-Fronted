import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { UbicacionService } from '../../../../core/services/ubicacion.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SubidaArchivoComponent } from '../../../../shared/components/subida-archivo/subida-archivo.component';
import { Ubicacion } from '../../../../core/models/ubicacion.models';

@Component({
  selector: 'app-paso-ubicacion',
  standalone: true,
  imports: [ReactiveFormsModule, SubidaArchivoComponent],
  styleUrl: './paso.scss',
  template: `
    <h2>Ubicación</h2>
    <p class="intro">Dónde queda el proyecto y los recursos para llegar: plano de urbanismo, vista aérea, recorrido 360° y video.</p>

    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <div class="fila">
        <label>Ciudad
          <input type="text" formControlName="ciudad" placeholder="Armenia" [class.invalido]="invalido('ciudad')" />
          @if (invalido('ciudad')) { <small class="error">Escribe la ciudad.</small> }
        </label>
        <label>Departamento
          <input type="text" formControlName="departamento" placeholder="Quindío" [class.invalido]="invalido('departamento')" />
          @if (invalido('departamento')) { <small class="error">Escribe el departamento.</small> }
        </label>
      </div>

      <label>Dirección <span class="opcional">(opcional)</span>
        <input type="text" formControlName="direccion" placeholder="Km 5 vía Armenia - La Tebaida" />
      </label>

      <label>Cómo llegar <span class="opcional">(opcional)</span>
        <textarea formControlName="referencias" placeholder="A 500 metros después del club campestre…"></textarea>
      </label>

      <div class="fila">
        <label>Latitud <span class="opcional">(opcional)</span>
          <input type="number" step="any" formControlName="latitud" placeholder="4.538889" [class.invalido]="invalido('latitud')" />
          @if (invalido('latitud')) { <small class="error">Debe estar entre -90 y 90.</small> }
        </label>
        <label>Longitud <span class="opcional">(opcional)</span>
          <input type="number" step="any" formControlName="longitud" placeholder="-75.672778" [class.invalido]="invalido('longitud')" />
          @if (invalido('longitud')) { <small class="error">Debe estar entre -180 y 180.</small> }
        </label>
      </div>

      <label>Enlace de Google Maps <span class="opcional">(opcional)</span>
        <input type="text" formControlName="googleMapsUrl" placeholder="https://www.google.com/maps/embed?pb=…" />
        <small class="ayuda">Para verlo dentro de la página, usa el enlace de "Compartir → Insertar un mapa".</small>
      </label>

      <div class="fila">
        <app-subida-archivo etiqueta="Plano de urbanismo" [tipos]="['imagen', 'pdf']" [(url)]="urbanismoUrl" />
        <app-subida-archivo etiqueta="Vista aérea" [tipos]="['imagen', 'video']" [(url)]="vistaAereaUrl" />
        <app-subida-archivo etiqueta="Recorrido 360° (foto panorámica)" [tipos]="['imagen']" [(url)]="recorrido360Url"
                            ayuda="Imagen equirectangular: se explora con el visor." />
        <app-subida-archivo etiqueta="Video de cómo llegar" [tipos]="['video']" [(url)]="videoComoLlegarUrl" />
      </div>

      <div class="acciones">
        <button type="button" class="secundario" (click)="asistente.anterior()">Atrás</button>
        <button type="submit" class="primario" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Guardar y continuar' }}
        </button>
      </div>
    </form>
  `
})
export class PasoUbicacionComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private ubicacionService = inject(UbicacionService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly urbanismoUrl = signal('');
  readonly vistaAereaUrl = signal('');
  readonly recorrido360Url = signal('');
  readonly videoComoLlegarUrl = signal('');

  readonly form = this.fb.group({
    ciudad: ['', Validators.required],
    departamento: ['', Validators.required],
    direccion: [''],
    referencias: [''],
    latitud: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitud: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    googleMapsUrl: ['']
  });

  constructor() {
    const u = this.asistente.ubicacion();
    if (u) {
      this.form.patchValue({
        ciudad: u.ciudad, departamento: u.departamento, direccion: u.direccion ?? '', referencias: u.referencias ?? '',
        latitud: u.latitud ?? null, longitud: u.longitud ?? null, googleMapsUrl: u.googleMapsUrl ?? ''
      });
      this.urbanismoUrl.set(u.urbanismoUrl ?? '');
      this.vistaAereaUrl.set(u.vistaAereaUrl ?? '');
      this.recorrido360Url.set(u.recorrido360Url ?? '');
      this.videoComoLlegarUrl.set(u.videoComoLlegarUrl ?? '');
    }
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  guardar(): void {
    const proyectoId = this.asistente.proyectoId();
    if (this.form.invalid || proyectoId == null) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos: Ubicacion = {
      proyectoId,
      ciudad: (v.ciudad ?? '').trim(),
      departamento: (v.departamento ?? '').trim(),
      direccion: v.direccion?.trim() || undefined,
      referencias: v.referencias?.trim() || undefined,
      latitud: v.latitud ?? undefined,
      longitud: v.longitud ?? undefined,
      googleMapsUrl: v.googleMapsUrl?.trim() || undefined,
      urbanismoUrl: this.urbanismoUrl() || undefined,
      vistaAereaUrl: this.vistaAereaUrl() || undefined,
      recorrido360Url: this.recorrido360Url() || undefined,
      videoComoLlegarUrl: this.videoComoLlegarUrl() || undefined
    };

    this.guardando.set(true);
    // Un proyecto solo puede tener una ubicación: si ya existe se actualiza en lugar de crear otra
    const existente = this.asistente.ubicacion();
    const peticion = existente?.id != null
      ? this.ubicacionService.actualizarUbicacion(existente.id, datos)
      : this.ubicacionService.crearUbicacion(datos);

    peticion.subscribe({
      next: ubicacion => {
        this.asistente.ubicacion.set(ubicacion);
        this.guardando.set(false);
        this.asistente.siguiente();
      },
      error: err => {
        console.error('Error al guardar la ubicación:', err);
        this.toast.showError('No se pudo guardar la ubicación. Inténtalo de nuevo.');
        this.guardando.set(false);
      }
    });
  }
}
