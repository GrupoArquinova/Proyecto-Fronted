import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { ProyectoService } from '../../../../core/services/proyecto.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SubidaArchivoComponent } from '../../../../shared/components/subida-archivo/subida-archivo.component';
import { CrearProyectoDTO, EstadoProyecto } from '../../../../core/models/proyecto.models';
import { PATRON_SLUG, generarSlug } from '../../../../core/utils/slug';

const EMPRESA_ID = 1;

@Component({
  selector: 'app-paso-proyecto',
  standalone: true,
  imports: [ReactiveFormsModule, SubidaArchivoComponent],
  styleUrl: './paso.scss',
  template: `
    <h2>Datos del proyecto</h2>
    <p class="intro">Lo básico para que el proyecto aparezca en la página. Podrás completar el resto en los siguientes pasos.</p>

    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <div class="fila">
        <label>Nombre del proyecto
          <input type="text" formControlName="nombre" placeholder="Condominio Campestre Los Álamos"
                 [class.invalido]="invalido('nombre')" (input)="alEscribirNombre()" />
          @if (invalido('nombre')) { <small class="error">Escribe un nombre de al menos 3 letras.</small> }
        </label>

        <label>Dirección web (slug)
          <input type="text" formControlName="slug" placeholder="condominio-campestre-los-alamos"
                 [class.invalido]="invalido('slug') || slugRepetido()" (input)="slugManual = true; slugRepetido.set(false)" />
          @if (slugRepetido()) { <small class="error">Ya existe un proyecto con esta dirección. Cámbiala.</small> }
          @else if (invalido('slug')) { <small class="error">Usa solo minúsculas, números y guiones.</small> }
          @else { <small class="ayuda">Se genera sola desde el nombre; puedes editarla.</small> }
        </label>
      </div>

      <label>Descripción <span class="opcional">(opcional)</span>
        <textarea formControlName="descripcion" placeholder="Proyecto campestre con zonas verdes, senderos y piscina…"></textarea>
      </label>

      <div class="fila">
        <label>Estado
          <select formControlName="estadoProyecto">
            @for (e of estados; track e.valor) { <option [value]="e.valor">{{ e.etiqueta }}</option> }
          </select>
        </label>
        <label>Fecha de lanzamiento <span class="opcional">(opcional)</span>
          <input type="date" formControlName="fechaLanzamiento" />
        </label>
      </div>

      <app-subida-archivo etiqueta="Foto de portada" [tipos]="['imagen']" [(url)]="imagenUrl"
                          ayuda="Se muestra en el listado de proyectos y en la bienvenida." />

      <div class="acciones">
        <span class="ayuda">{{ asistente.tieneProyecto() ? 'Proyecto creado. Tus cambios se guardan al continuar.' : 'El proyecto se crea al continuar.' }}</span>
        <button type="submit" class="primario" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Guardar y continuar' }}
        </button>
      </div>
    </form>
  `
})
export class PasoProyectoComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private proyectoService = inject(ProyectoService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly estados: { valor: EstadoProyecto; etiqueta: string }[] = [
    { valor: 'PLANIFICACION', etiqueta: 'En planificación' },
    { valor: 'EN_CONSTRUCCION', etiqueta: 'En construcción' },
    { valor: 'ENTREGADO', etiqueta: 'Entregado' },
    { valor: 'FINALIZADO', etiqueta: 'Finalizado' }
  ];

  readonly guardando = signal(false);
  readonly slugRepetido = signal(false);
  readonly imagenUrl = signal('');

  /** Mientras no se edite el slug a mano, sigue al nombre. */
  slugManual = false;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(180)]],
    slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(PATRON_SLUG)]],
    descripcion: [''],
    estadoProyecto: ['PLANIFICACION' as EstadoProyecto, Validators.required],
    fechaLanzamiento: ['']
  });

  constructor() {
    // Si se retoma un borrador, el formulario arranca con lo ya guardado
    const existente = this.asistente.proyecto();
    if (existente) {
      this.form.patchValue({
        nombre: existente.nombre,
        slug: existente.slug ?? '',
        descripcion: existente.descripcion ?? '',
        estadoProyecto: existente.estadoProyecto ?? 'PLANIFICACION',
        fechaLanzamiento: existente.fechaLanzamiento ?? ''
      });
      this.imagenUrl.set(existente.imagenUrl ?? '');
      this.slugManual = true;
    }
  }

  alEscribirNombre(): void {
    if (this.slugManual) return;
    this.form.controls.slug.setValue(generarSlug(this.form.controls.nombre.value));
    this.slugRepetido.set(false);
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos: CrearProyectoDTO = {
      empresaId: EMPRESA_ID,
      nombre: v.nombre.trim(),
      slug: v.slug,
      descripcion: v.descripcion.trim() || undefined,
      estadoProyecto: v.estadoProyecto,
      // Un proyecto nuevo nace sin publicar; se publica al final del asistente
      publicado: this.asistente.proyecto()?.publicado ?? false,
      imagenUrl: this.imagenUrl() || undefined,
      fechaLanzamiento: v.fechaLanzamiento || undefined
    };

    this.guardando.set(true);
    const id = this.asistente.proyectoId();
    const peticion = id == null
      ? this.proyectoService.crearProyecto(datos)
      : this.proyectoService.actualizarProyecto(id, datos);

    peticion.subscribe({
      next: proyecto => {
        this.asistente.fijarProyecto(proyecto);
        this.guardando.set(false);
        this.asistente.siguiente();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) {
          this.slugRepetido.set(true);
          this.toast.showError('Ya existe un proyecto con esa dirección web.');
        } else {
          console.error('Error al guardar el proyecto:', err);
          this.toast.showError('No se pudo guardar el proyecto. Inténtalo de nuevo.');
        }
      }
    });
  }
}
