import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { WalletService } from '../core/services/WalletService.service';

type Estado = 'reposo' | 'enviando' | 'enviado' | 'error';

/** Mismo formato que valida el servidor: algo@dominio.ext, sin espacios. */
const FORMATO_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Tarjeta digital de Grupo Arquinova para Google Wallet (Android): la persona escribe su correo y recibe el enlace para
 * guardarla. Va en el pie de la página de inicio, no suelta en todas las pantallas.
 */
@Component({
  selector: 'app-solicitud-wallet',
  standalone: true,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './solicitud-wallet.html',
  styleUrl: './solicitud-wallet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudWallet {
  private readonly walletService = inject(WalletService);

  readonly correo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(254), Validators.pattern(FORMATO_CORREO)],
  });
  readonly estado = signal<Estado>('reposo');
  /** Clave i18n del mensaje que se muestra bajo el formulario (vacía = nada que mostrar). */
  readonly mensajeClave = signal('');

  enviar(evento?: Event): void {
    // Sin esto el navegador enviaría el formulario por su cuenta y recargaría la página
    evento?.preventDefault();
    if (this.estado() === 'enviando') return;
    const correo = this.correo.value.trim();
    if (!correo || this.correo.invalid) {
      this.correo.markAsTouched();
      this.estado.set('error');
      this.mensajeClave.set('wallet.correoInvalido');
      return;
    }

    this.estado.set('enviando');
    this.mensajeClave.set('');
    this.walletService.enviarPase(correo).subscribe({
      next: () => {
        this.correo.reset('');
        this.estado.set('enviado');
        this.mensajeClave.set('wallet.enviado');
      },
      error: (err: unknown) => {
        this.estado.set('error');
        this.mensajeClave.set(claveDeError(err));
      },
    });
  }
}

/** Mensaje para la persona según lo que respondió el servidor (el texto técnico del servidor no se muestra). */
export function claveDeError(err: unknown): string {
  const estado = err instanceof HttpErrorResponse ? err.status : -1;
  switch (estado) {
    case 0: return 'wallet.errorRed';
    case 400: return 'wallet.correoInvalido';
    case 429: return 'wallet.errorLimite';
    case 503: return 'wallet.errorNoDisponible';
    default: return 'wallet.errorGenerico';
  }
}
