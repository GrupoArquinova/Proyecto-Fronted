import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol, inicioDelPanel } from '../models/roles';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Deja entrar solo a los roles indicados. Quien no tenga permiso va a la primera pantalla que sí le corresponde
 * (nunca a la misma, así no hay bucle) y ve un aviso; sin sesión o sin rol del panel, al login.
 */
export function roleGuard(permitidos: readonly Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roles = auth.roles();

    if (roles.some(r => permitidos.includes(r))) return true;

    const inicio = inicioDelPanel(roles);
    if (!inicio) return router.createUrlTree(['/login']);

    inject(ToastService).showInfo('No tienes permiso para ver esa pantalla.');
    return router.createUrlTree(['/admin', inicio]);
  };
}

/** Entrada a /admin sin pantalla concreta: lleva a la de inicio del rol. */
export const inicioPanelGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const inicio = inicioDelPanel(auth.roles());
  return router.createUrlTree(inicio ? ['/admin', inicio] : ['/login']);
};
