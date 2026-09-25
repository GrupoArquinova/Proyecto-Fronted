import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Evitar interceptar o redirigir en endpoints públicos y servicios externos
  const esRutaPublica = req.url.includes('/auth/login') || 
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
      // 3. Manejar 401/403 únicamente en rutas protegidas
      if (!esRutaPublica && (error.status === 401 || error.status === 403)) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};