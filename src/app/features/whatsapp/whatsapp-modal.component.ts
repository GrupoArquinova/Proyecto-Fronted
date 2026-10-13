import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import { IdiomaService } from '../../core/services/idioma.service';

@Component({
  selector: 'app-whatsapp-modal',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './whatsapp-modal.component.html',
  styleUrl: './whatsapp-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsappModalComponent {
  private idioma = inject(IdiomaService);

  isOpen = false;

  nombre = '';
  telefono = '';
  email = '';
  autorizo = false;
  /** Clave de traducción del error visible (así cambia de idioma junto con el sitio). */
  errorKey = '';

  private numeroWhatsApp: string = environment.contacto.whatsapp;

  toggleModal(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.resetForm();
    }
  }

  iniciarChat(): void {
    if (!this.nombre.trim() || !this.telefono.trim() || !this.email.trim()) {
      this.errorKey = 'whatsappModal.errorCampos';
      return;
    }

    if (!this.autorizo) {
      this.errorKey = 'whatsappModal.errorAutorizo';
      return;
    }

    this.errorKey = '';

    // El mensaje sale en el idioma del sitio, para que el asesor sepa en cuál responder
    const mensaje = this.idioma.t('whatsappModal.mensaje', {
      nombre: this.nombre.trim(),
      telefono: this.telefono.trim(),
      correo: this.email.trim(),
    });

    const url = `https://wa.me/${this.numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
    this.toggleModal();
  }

  private resetForm(): void {
    this.nombre = '';
    this.telefono = '';
    this.email = '';
    this.autorizo = false;
    this.errorKey = '';
  }
}
