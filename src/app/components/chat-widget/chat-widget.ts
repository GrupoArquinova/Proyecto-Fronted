import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ChatMessage } from '../../core/models/chat.model';
import { ChatService, PREGUNTA_MAX, construirHistorial } from '../../core/services/chat.service';
import { esRutaPublica } from '../../core/utils/rutas-publicas';
import { IdiomaService } from '../../core/services/idioma.service';

/** El asistente y el botón de WhatsApp son del sitio público: no van en el panel de administración ni en las pantallas de acceso. */
export function chatVisibleEn(url: string): boolean {
  return esRutaPublica(url);
}

/** Asistente de IA del sitio: píldora junto al botón de WhatsApp y ventana de conversación. */
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidget {
  private chatService = inject(ChatService);
  private idioma = inject(IdiomaService);
  private router = inject(Router);

  readonly preguntaMax = PREGUNTA_MAX;
  readonly abierto = signal(false);
  readonly cargando = signal(false);
  readonly mensajes = signal<ChatMessage[]>([]);
  readonly visible = signal(chatVisibleEn(this.router.url));
  /** Claves i18n de las preguntas sugeridas que se ofrecen con la conversación vacía. */
  readonly sugerencias = ['chat.sug1', 'chat.sug2', 'chat.sug3', 'chat.sug4'];
  preguntaActual = '';
  private envioEnCurso?: Subscription;

  private cuerpo = viewChild<ElementRef<HTMLElement>>('cuerpo');
  private campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(e => {
      this.visible.set(chatVisibleEn(e.urlAfterRedirects));
      if (!this.visible()) this.abierto.set(false);
    });

    // Al abrir el chat el foco va al campo de texto
    effect(() => {
      const el = this.campo()?.nativeElement;
      if (el) setTimeout(() => el.focus());
    });

    // Siempre se ve el último mensaje
    effect(() => {
      this.mensajes();
      this.cargando();
      const el = this.cuerpo()?.nativeElement;
      if (el) setTimeout(() => (el.scrollTop = el.scrollHeight));
    });
  }

  toggleChat(): void {
    this.abierto.update(v => !v);
  }

  /** Empieza de cero: borra la conversación (y descarta una respuesta que aún no llegó). */
  nuevaConversacion(): void {
    this.envioEnCurso?.unsubscribe();
    this.envioEnCurso = undefined;
    this.mensajes.set([]);
    this.preguntaActual = '';
    this.cargando.set(false);
    setTimeout(() => this.campo()?.nativeElement.focus());
  }

  /** Una pregunta sugerida se envía como cualquier otra. */
  enviarSugerencia(clave: string): void {
    if (this.cargando()) return;
    this.preguntaActual = this.idioma.t(clave);
    this.enviarMensaje();
  }

  enviarMensaje(): void {
    const texto = this.preguntaActual.trim();
    if (!texto || this.cargando()) return;

    // El historial se toma antes de añadir la pregunta actual
    const historial = construirHistorial(this.mensajes());
    this.agregar('usuario', texto);
    this.preguntaActual = '';
    this.cargando.set(true);

    this.envioEnCurso = this.chatService.enviarPregunta(texto, historial).subscribe({
      next: respuesta => {
        this.agregar('ia', respuesta);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        // El detalle técnico no se muestra: solo un aviso en el idioma del sitio
        const limite = err instanceof HttpErrorResponse && err.status === 429;
        this.agregar('ia', this.idioma.t(limite ? 'chat.demasiadas' : 'chat.error'), true);
        this.cargando.set(false);
      },
    });
  }

  private agregar(remitente: ChatMessage['remitente'], texto: string, error = false): void {
    this.mensajes.update(lista => [...lista, { remitente, texto, fecha: new Date(), ...(error && { error }) }]);
  }
}
