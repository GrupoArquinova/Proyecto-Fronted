import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-whatsapp-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-modal.component.html',
  styleUrl: './whatsapp-modal.component.scss'
})
export class WhatsappModalComponent {
  isOpen: boolean = false;

  nombre: string = '';
  telefono: string = '';
  email: string = '';
  autorizo: boolean = false;
  errorMessage: string = '';

  private numeroWhatsApp: string = '573167849671';

  toggleModal(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.resetForm();
    }
  }

iniciarChat(): void {
    if (!this.nombre.trim() || !this.telefono.trim() || !this.email.trim()) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    if (!this.autorizo) {
      this.errorMessage = 'Debe autorizar el tratamiento de datos';
      return;
    }

    this.errorMessage = '';

    const mensaje = `Hola, mi nombre es ${this.nombre.trim()}.

Telefono: ${this.telefono.trim()}

Correo:
${this.email.trim()}

Quisiera solicitar mas informacion sobre los proyectos de Arquinova.`;

    const url = `https://wa.me/${this.numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
    this.toggleModal();
}

  private resetForm(): void {
    this.nombre = '';
    this.telefono = '';
    this.email = '';
    this.autorizo = false;
    this.errorMessage = '';
  }
}