import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege /admin y todas sus rutas hijas: hace falta una sesión vigente (isLoggedIn() también revisa si el token
 * expiró) y alguno de los roles del panel (administrador, comercial o editor). Es para la experiencia de la persona;
 * el backend vuelve a comprobar todo. Qué pantallas ve cada rol lo decide `roleGuard`.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    if (authService.tieneAccesoPanel()) {
      return true;
    }
    // Sesión sin rol del panel (o de una versión anterior): se cierra y se pide ingresar de nuevo
    authService.logout();
  }

  return router.createUrlTree(['/login']);
};
