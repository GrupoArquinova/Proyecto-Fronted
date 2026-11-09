import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; // ⚠️ Ajusta los puntos (../) según la carpeta donde tengas guardado este servicio

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  
  // Utiliza la URL base del environment y le concatena la ruta específica del wallet
  private apiUrl = `${environment.apiUrl}/wallet/enviar-pase`;

  enviarPase(email: string): Observable<unknown> {
    return this.http.post(this.apiUrl, { email });
  }
}