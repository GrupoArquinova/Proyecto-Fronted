import { TranslocoPipe } from '@jsverse/transloco';
import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { inicializarSeccion } from '../seccion.utils';
import { SolicitudService } from '../../../../../core/services/solicitud.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { SolicitudPublicaRequest } from '../../../../../core/models/solicitud.models';
import { alMenosUnMedioDeContacto } from '../../../../../core/utils/solicitudes';
import { environment } from '../../../../../../environments/environment';
import { IdiomaService } from '../../../../../core/services/idioma.service';

@Component({
  selector: 'app-contacto-publico',
  standalone: true,
  imports: [TranslocoPipe, ReactiveFormsModule],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.scss'
})
export class ContactoPublicoComponent {
  private seccion = inicializarSeccion('contacto');
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolicitudService);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private idioma = inject(IdiomaService);

  readonly contacto = environment.contacto;
  readonly whatsappUrl = `https://wa.me/${environment.contacto.whatsapp}`;

  readonly proyecto = computed(() => this.seccion.detalle()?.proyecto ?? null);
  readonly lugar = computed(() => {
    const u = this.seccion.detalle()?.ubicacion;
    return u ? [u.ciudad, u.departamento].filter(Boolean).join(', ') : '';
  });

  /** Lote por el que se consulta (llega con ?lote=<id> desde "Solicitar información"). */
  private loteId = toSignal(
    this.route.queryParamMap.pipe(map(p => Number(p.get('lote')) || null)),
    { initialValue: Number(this.route.snapshot.queryParamMap.get('lote')) || null }
  );
  readonly lote = computed(() =>
    this.seccion.detalle()?.lotes.find(l => l.id === this.loteId()) ?? null);

  readonly enviando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email]],
    mensaje: ['', [Validators.required, Validators.maxLength(1000)]],
    consentimientoDatos: [false, Validators.requiredTrue]
  }, { validators: alMenosUnMedioDeContacto });

  /** Falta el medio de contacto y la persona ya tocó alguno de los dos campos. */
  readonly faltaMedioDeContacto = () =>
    this.form.hasError('sinMedioDeContacto')
    && (this.form.controls.telefono.touched || this.form.controls.correo.touched);

  constructor() {
    // Si llegan por un lote, el mensaje ya viene escrito (sin pisar lo que la persona haya escrito)
    effect(() => {
      const lote = this.lote();
      if (lote && !untracked(() => this.form.controls.mensaje.value)) {
        this.form.controls.mensaje.setValue(this.idioma.t('proyecto.contacto.mensajeLote', { codigo: lote.codigo }));
      }
    });
  }

  enviar(): void {
    const proyecto = this.proyecto();
    if (this.form.invalid || !proyecto || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const solicitud: SolicitudPublicaRequest = {
      ...this.form.getRawValue(),
      proyectoId: proyecto.id ?? null,
      loteId: this.lote()?.id ?? null,
      userAgent: isPlatformBrowser(this.platformId) ? navigator.userAgent : ''
    };

    this.enviando.set(true);
    this.solicitudService.enviarSolicitud(solicitud).subscribe({
      next: () => {
        this.toast.showSuccess(this.idioma.t('home.formulario.exito'));
        this.form.reset();
        this.enviando.set(false);
      },
      error: err => {
        console.error('Error al enviar la solicitud:', err);
        this.toast.showError(this.idioma.t('home.formulario.error'));
        this.enviando.set(false);
      }
    });
  }

  /** true si el campo es inválido y el usuario ya lo tocó (o intentó enviar). */
  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }
}
