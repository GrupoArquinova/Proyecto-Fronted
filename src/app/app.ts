import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WhatsappModalComponent } from './features/whatsapp/whatsapp-modal.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WhatsappModalComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('constructora-frontend');
}
