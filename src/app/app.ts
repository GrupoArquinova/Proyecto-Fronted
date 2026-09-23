import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WhatsappModalComponent } from './features/whatsapp/whatsapp-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WhatsappModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('constructora-frontend');
}
