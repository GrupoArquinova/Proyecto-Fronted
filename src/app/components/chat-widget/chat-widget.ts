import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ChatMessage } from '../../core/models/chat.model';
import { ChatService, PREGUNTA_MAX } from '../../core/services/chat.service';
import { IdiomaService } from '../../core/services/idioma.service';

/** Rutas donde el asistente no tiene sentido: el panel de administración y las pantallas de acceso. */
const RUTAS_SIN_CHAT = ['/admin', '/login', '/recuperar-password', '/reset-password'];

export function chatVisibleEn(url: string): boolean {
  const ruta = url.split(/[?#]/)[0];
  return !RUTAS_SIN_CHAT.some(prefijo => ruta === prefijo || ruta.startsWith(prefijo + '/'));
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
  preguntaActual = '';

  private cuerpo = viewChild<ElementRef<HTMLElement>>('cuerpo');

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(e => {
      this.visible.set(chatVisibleEn(e.urlAfterRedirects));
      if (!this.visible()) this.abierto.set(false);
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

  enviarMensaje(): void {
    const texto = this.preguntaActual.trim();
    if (!texto || this.cargando()) return;

    this.agregar('usuario', texto);
    this.preguntaActual = '';
    this.cargando.set(true);

    this.chatService.enviarPregunta(texto).subscribe({
      next: respuesta => {
        this.agregar('ia', respuesta);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        // El detalle técnico no se muestra: solo un aviso en el idioma del sitio
        const limite = err instanceof HttpErrorResponse && err.status === 429;
        this.agregar('ia', this.idioma.t(limite ? 'chat.demasiadas' : 'chat.error'));
        this.cargando.set(false);
      },
    });
  }

  private agregar(remitente: ChatMessage['remitente'], texto: string): void {
    this.mensajes.update(lista => [...lista, { remitente, texto, fecha: new Date() }]);
  }
}
