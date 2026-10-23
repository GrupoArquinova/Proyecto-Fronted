import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
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
import { TurnstileService } from '../../../../../core/services/turnstile.service';
import { CaptchaTurnstileComponent } from '../../../../../shared/components/captcha-turnstile/captcha-turnstile.component';

@Component({
  selector: 'app-contacto-publico',
  standalone: true,
  imports: [TranslocoPipe, ReactiveFormsModule, CaptchaTurnstileComponent],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactoPublicoComponent {
  private seccion = inicializarSeccion('contacto');
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolicitudService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private idioma = inject(IdiomaService);
  private captcha = viewChild(CaptchaTurnstileComponent);

  /** Hay captcha (el sitio tiene clave de Turnstile) y, entonces, no se envía sin su token. */
  readonly captchaActivo = inject(TurnstileService).activo;
  readonly captchaToken = signal<string | null>(null);
  readonly puedeEnviar = computed(() => !this.captchaActivo || this.captchaToken() !== null);

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

  /** Tipología (villa) por la que se consulta (llega con ?casa=<id> desde "Solicitar información" en la villa). */
  private casaId = toSignal(
    this.route.queryParamMap.pipe(map(p => Number(p.get('casa')) || null)),
    { initialValue: Number(this.route.snapshot.queryParamMap.get('casa')) || null }
  );
  readonly casa = computed(() =>
    this.seccion.detalle()?.casasModelo.find(c => c.id === this.casaId()) ?? null);

  readonly enviando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email]],
    mensaje: ['', [Validators.required, Validators.maxLength(1000)]],
    consentimientoDatos: [false, Validators.requiredTrue],
    /** Honeypot: oculto para las personas (ver .campo-trampa en styles.scss). */
    sitioWeb: ['']
  }, { validators: alMenosUnMedioDeContacto });

  /** Falta el medio de contacto y la persona ya tocó alguno de los dos campos. */
  readonly faltaMedioDeContacto = () =>
    this.form.hasError('sinMedioDeContacto')
    && (this.form.controls.telefono.touched || this.form.controls.correo.touched);

  constructor() {
    // Si llegan por un lote o una villa, el mensaje ya viene escrito (sin pisar lo que la persona haya escrito)
    effect(() => {
      const lote = this.lote();
      const casa = this.casa();
      if (!untracked(() => this.form.controls.mensaje.value)) {
        if (lote) {
          this.form.controls.mensaje.setValue(this.idioma.t('proyecto.contacto.mensajeLote', { codigo: lote.codigo }));
        } else if (casa) {
          this.form.controls.mensaje.setValue(this.idioma.t('proyecto.contacto.mensajeVilla', { nombre: casa.nombre }));
        }
      }
    });
  }

  enviar(): void {
    const proyecto = this.proyecto();
    if (this.form.invalid || !proyecto || this.enviando() || !this.puedeEnviar()) {
      this.form.markAllAsTouched();
      return;
    }

    const solicitud: SolicitudPublicaRequest = {
      ...this.form.getRawValue(),
      proyectoId: proyecto.id ?? null,
      loteId: this.lote()?.id ?? null,
      casaModeloId: this.casa()?.id ?? null,
      ...(this.captchaToken() ? { captchaToken: this.captchaToken()! } : {})
    };

    this.enviando.set(true);
    this.solicitudService.enviarSolicitud(solicitud).subscribe({
      next: () => {
        this.toast.showSuccess(this.idioma.t('home.formulario.exito'));
        this.form.reset();
        this.captcha()?.resetear();
        this.enviando.set(false);
      },
      error: err => {
        console.error('Error al enviar la solicitud:', err);
        this.toast.showError(this.idioma.t('home.formulario.error'));
        this.captcha()?.resetear();
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
