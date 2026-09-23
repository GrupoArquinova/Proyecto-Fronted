import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, AuthResponse } from '../models/auth.models';
import { ForgotPasswordRequest, ResetPasswordRequest } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Corregido: signo '=' en lugar de ':'
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/auth';

  // Corregido: 'Observable' con 'b'
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: AuthResponse) => {
        if (response && response.token) {
          localStorage.setItem('jwt_token', response.token);
          localStorage.setItem('user_name', response.nombre || 'Admin Juan');
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
    return localStorage.getItem('jwt_token');
  }

  getUserName(): string {
    return localStorage.getItem('user_name') || 'Admin Juan';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_name');
  }
}