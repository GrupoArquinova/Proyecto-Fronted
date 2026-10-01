import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  showSuccess(message: string): void {
    this.addToast(message, 'success');
  }

  showError(message: string): void {
    this.addToast(message, 'error');
  }

  showInfo(message: string): void {
    this.addToast(message, 'info');
  }

  private addToast(message: string, type: 'success' | 'error' | 'info'): void {
    const id = this.nextId++;
    const newToast: Toast = { id, message, type };
    this.toasts.update(current => [...current, newToast]);

    setTimeout(() => {
      this.removeToast(id);
    }, 4000);
  }

  removeToast(id: number): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
