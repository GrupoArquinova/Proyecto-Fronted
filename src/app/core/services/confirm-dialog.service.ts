import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  isOpen = signal(false);
  config = signal<ConfirmDialogConfig>({
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'danger'
  });

  private resolveCallback: ((result: boolean) => void) | null = null;

  open(cfg: ConfirmDialogConfig): Promise<boolean> {
    this.config.set({
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      type: 'danger',
      ...cfg
    });
    this.isOpen.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolveCallback = resolve;
    });
  }

  confirm(): void {
    this.isOpen.set(false);
    this.resolveCallback?.(true);
    this.resolveCallback = null;
  }

  cancel(): void {
    this.isOpen.set(false);
    this.resolveCallback?.(false);
    this.resolveCallback = null;
  }
}
