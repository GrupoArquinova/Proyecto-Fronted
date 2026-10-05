import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { LoginRequest, AuthResponse } from '../models/auth.models';
import { ForgotPasswordRequest, ResetPasswordRequest } from '../models/auth.models';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'jwt_token';
const USER_NAME_KEY = 'user_name';
const NOMBRE_POR_DEFECTO = 'Administrador';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;
  private platformId = inject(PLATFORM_ID);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: AuthResponse) => {
        if (response && response.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(USER_NAME_KEY, response.nombre || NOMBRE_POR_DEFECTO);
        }
      })
    );
  }

  solicitarRecuperacion(dto: ForgotPasswordRequest): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/forgot-password`, dto);
  }

  restablecerPassword(dto: ResetPasswordRequest): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/reset-password`, dto);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  getUserName(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(USER_NAME_KEY) || NOMBRE_POR_DEFECTO;
    }
    return NOMBRE_POR_DEFECTO;
  }

  /**
   * true solo si hay token y todavía no ha expirado.
   * Si el token ya expiró, limpia la sesión local de una vez.
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    if (this.tokenExpirado(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  /**
   * Cierra la sesión en el backend (revoca el token en la lista negra)
   * y luego limpia la sesión local. Aunque el backend falle o no responda,
   * la sesión local se cierra igual.
   */
  cerrarSesion(): Observable<void> {
    const token = this.getToken();
    if (!token || this.tokenExpirado(token)) {
      this.logout();
      return of(undefined);
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      catchError(() => of(null)),
      map(() => this.logout())
    );
  }

  /** Limpia solo la sesión local (sin llamar al backend). */
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_NAME_KEY);
    }
  }

  /**
   * Lee el campo "exp" (segundos UNIX) del payload del JWT.
   * No valida la firma: eso lo hace siempre el backend.
   * Un token mal formado se trata como expirado.
   */
  private tokenExpirado(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const datos = JSON.parse(atob(relleno));
      if (typeof datos.exp !== 'number') {
        return false; // sin "exp": que decida el backend
      }
      return Date.now() >= datos.exp * 1000;
    } catch {
      return true;
    }
  }
}
