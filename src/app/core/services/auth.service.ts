import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { LoginRequest, AuthResponse } from '../models/auth.models';
import { ForgotPasswordRequest, ResetPasswordRequest } from '../models/auth.models';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { CLAVE_BORRADOR_ASISTENTE } from '../utils/almacenamiento';

const TOKEN_KEY = 'jwt_token';
const USER_NAME_KEY = 'user_name';
const NOMBRE_POR_DEFECTO = 'Administrador';
const ROL_ADMINISTRADOR = 'ROLE_ADMINISTRADOR';
/** Cuando a la sesión le quedan menos de estos segundos, se renueva sola en la siguiente petición. */
// (No acorta la vida del token: esa la fija el backend al emitirlo; este umbral solo decide cuándo se pide uno nuevo.)
const UMBRAL_RENOVACION_SEGUNDOS = 20 * 60;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;
  private platformId = inject(PLATFORM_ID);
  /** Renovación en curso: varias peticiones a la vez comparten una sola llamada al backend. */
  private renovacion$: Observable<string | null> | null = null;

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
      this.limpiarBorradores();
      return of(undefined);
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      catchError(() => of(null)),
      map(() => {
        this.logout();
        this.limpiarBorradores();
      })
    );
  }

  /** Al cerrar sesión de forma explícita no queda en el navegador el borrador del asistente de proyectos. */
  private limpiarBorradores(): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.removeItem(CLAVE_BORRADOR_ASISTENTE); } catch { /* sin almacenamiento: no hay nada que borrar */ }
    }
  }

  /**
   * ¿La persona con sesión tiene el rol de administrador? Se lee del token solo para decidir qué mostrar:
   * el backend vuelve a comprobar el rol en cada petición. Un token sin la lista de roles (de una versión anterior)
   * no sirve para entrar al panel: hay que iniciar sesión de nuevo.
   */
  esAdministrador(): boolean {
    const token = this.getToken();
    const roles = token ? this.leerPayload(token)?.['roles'] : null;
    return Array.isArray(roles) && roles.includes(ROL_ADMINISTRADOR);
  }

  /** ¿La sesión sigue vigente pero ya le queda poco? (para renovarla antes de que venza) */
  necesitaRenovar(): boolean {
    const token = this.getToken();
    const exp = token ? this.leerPayload(token)?.['exp'] : null;
    if (typeof exp !== 'number') {
      return false;
    }
    const restantes = exp - Date.now() / 1000;
    return restantes > 0 && restantes < UMBRAL_RENOVACION_SEGUNDOS;
  }

  /**
   * Cambia el token actual por uno nuevo (POST /auth/renovar) y lo guarda. Emite el token nuevo, o null si no se pudo
   * (entonces se sigue con el actual hasta que venza). Si varias peticiones piden renovar a la vez, hay una sola llamada.
   */
  renovarSesion(): Observable<string | null> {
    if (!this.renovacion$) {
      this.renovacion$ = this.http.post<AuthResponse>(`${this.apiUrl}/renovar`, {}).pipe(
        map(respuesta => respuesta?.token ?? null),
        tap(token => {
          if (token && isPlatformBrowser(this.platformId)) {
            localStorage.setItem(TOKEN_KEY, token);
          }
        }),
        catchError(() => of(null)),
        finalize(() => (this.renovacion$ = null)),
        shareReplay(1)
      );
    }
    return this.renovacion$;
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
    const datos = this.leerPayload(token);
    if (!datos) {
      return true;
    }
    if (typeof datos['exp'] !== 'number') {
      return false; // sin "exp": que decida el backend
    }
    return Date.now() >= datos['exp'] * 1000;
  }

  /** Contenido (payload) del JWT sin validar la firma, o null si el token está mal formado. */
  private leerPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const datos = JSON.parse(atob(relleno));
      return datos && typeof datos === 'object' ? (datos as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
