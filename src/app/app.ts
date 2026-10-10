import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { DatosSeo, SeoService } from './core/services/seo.service';
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

  private router = inject(Router);
  private seo = inject(SeoService);

  constructor() {
    // Las páginas fijas declaran su título en la ruta (data.seo); las que dependen de datos lo ponen ellas mismas
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      const datos = this.datosSeoDe(this.router.routerState.snapshot.root);
      if (datos) this.seo.establecer(datos);
    });
  }

  /** Los datos de SEO de la ruta más profunda que los declare. */
  private datosSeoDe(ruta: ActivatedRouteSnapshot): DatosSeo | null {
    let encontrado: DatosSeo | null = (ruta.data['seo'] as DatosSeo | undefined) ?? null;
    for (const hija of ruta.children) {
      encontrado = this.datosSeoDe(hija) ?? encontrado;
    }
    return encontrado;
  }
}
