import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege /admin y todas sus rutas hijas: hace falta una sesión vigente (isLoggedIn() también revisa si el token
 * expiró) y el rol de administrador. Es para la experiencia de la persona; el backend vuelve a comprobar todo.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    if (authService.esAdministrador()) {
      return true;
    }
    // Sesión sin permisos de administrador (o de una versión anterior): se cierra y se pide ingresar de nuevo
    authService.logout();
  }

  return router.createUrlTree(['/login']);
};
