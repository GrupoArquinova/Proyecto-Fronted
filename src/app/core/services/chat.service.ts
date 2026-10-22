import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IdiomaService } from './idioma.service';

/** Máximo de caracteres de una pregunta (el backend la rechaza si pasa de 500). */
export const PREGUNTA_MAX = 500;

/** Espera máxima: el backend gratuito puede tardar en despertar la primera vez. */
const ESPERA_MAXIMA_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private idioma = inject(IdiomaService);

  /** Pregunta al asistente de IA; responde con texto plano. Lleva el idioma del sitio para que conteste en él. */
  enviarPregunta(pregunta: string): Observable<string> {
    return this.http
      .post(`${environment.apiUrl}/chat`, { pregunta: pregunta.trim(), idioma: this.idioma.idioma() }, { responseType: 'text' })
      .pipe(timeout(ESPERA_MAXIMA_MS));
  }
}
