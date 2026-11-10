import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage, ChatTurno } from '../models/chat.model';
import { IdiomaService } from './idioma.service';

/** Máximo de caracteres de una pregunta (el backend la rechaza si pasa de 500). */
export const PREGUNTA_MAX = 500;

/** Límites del historial que acepta el backend. */
export const HISTORIAL_MAX_TURNOS = 6;
export const HISTORIAL_MAX_TEXTO = 600;

/**
 * Arma el historial a enviar con los últimos turnos de la conversación (antes de añadir la pregunta actual).
 * Excluye los avisos de error, recorta cada texto, toma los últimos 6 y garantiza que empiece con 'user', que alterne
 * y que termine con 'model' (la pregunta actual será el siguiente 'user'). Si dos turnos seguidos son del mismo rol
 * (p. ej. una pregunta cuya respuesta fue un error), se conserva el más reciente.
 */
export function construirHistorial(mensajes: readonly ChatMessage[]): ChatTurno[] {
  const turnos: ChatTurno[] = mensajes
    .filter(m => !m.error && m.texto.trim())
    .map(m => ({ rol: m.remitente === 'usuario' ? ('user' as const) : ('model' as const), texto: m.texto.trim().slice(0, HISTORIAL_MAX_TEXTO) }))
    .slice(-HISTORIAL_MAX_TURNOS);

  const alternados: ChatTurno[] = [];
  for (const t of turnos) {
    if (alternados.length && alternados[alternados.length - 1].rol === t.rol) alternados[alternados.length - 1] = t;
    else alternados.push(t);
  }
  while (alternados.length && alternados[0].rol !== 'user') alternados.shift();
  while (alternados.length && alternados[alternados.length - 1].rol !== 'model') alternados.pop();
  return alternados;
}

/** Espera máxima: el backend gratuito puede tardar en despertar la primera vez. */
const ESPERA_MAXIMA_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private idioma = inject(IdiomaService);

  /** Pregunta al asistente de IA; responde con texto plano. Lleva el idioma del sitio para que conteste en él y, si hay, el historial reciente para dar continuidad. */
  enviarPregunta(pregunta: string, historial?: ChatTurno[]): Observable<string> {
    const cuerpo: { pregunta: string; idioma: string; historial?: ChatTurno[] } = { pregunta: pregunta.trim(), idioma: this.idioma.idioma() };
    if (historial?.length) cuerpo.historial = historial;
    return this.http
      .post(`${environment.apiUrl}/chat`, cuerpo, { responseType: 'text' })
      .pipe(timeout(ESPERA_MAXIMA_MS));
  }
}
