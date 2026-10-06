import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  // 1. Evitar interceptar o redirigir en endpoints públicos y servicios externos
  // '/auth/logout' se excluye porque AuthService.cerrarSesion() ya envía su propio token
  // y un 401 ahí no debe disparar el aviso de "sesión expirada".
  const esRutaPublica = req.url.includes('/auth/login') || 
                        req.url.includes('/auth/logout') || 
                        req.url.includes('/recuperar-password') || 
                        req.url.includes('/reset-password') ||
                        req.url.includes('cloudinary.com');

  const token = authService.getToken();

  // 2. Adjuntar el Token JWT solo si existe Y no es una ruta pública/externa
  const clonedReq = (token && !esRutaPublica)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 3. Manejar 401/403 únicamente en rutas protegidas y cuando había una sesión que expiró:
      // un visitante sin sesión no debe ser enviado al login por un recurso que falló en el sitio público
      if (!esRutaPublica && token && (error.status === 401 || error.status === 403)) {
        authService.logout();
        toastService.showInfo('Tu sesión ha expirado, por favor ingresa de nuevo.');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};