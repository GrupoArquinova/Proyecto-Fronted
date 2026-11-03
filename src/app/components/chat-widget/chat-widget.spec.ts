import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideI18nPruebas } from '../../i18n/pruebas';
import { ChatWidget, chatVisibleEn } from './chat-widget';
import { environment } from '../../../environments/environment';

describe('ChatWidget', () => {
  function crear() {
    TestBed.configureTestingModule({
      imports: [ChatWidget],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()],
    });
    const fixture = TestBed.createComponent(ChatWidget);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
  }

  const abrir = (f: ReturnType<typeof crear>) => {
    (f.el.querySelector('.chat-toggle-btn') as HTMLButtonElement).click();
    f.fixture.detectChanges();
  };

  const escribirYEnviar = (f: ReturnType<typeof crear>, texto: string) => {
    f.fixture.componentInstance.preguntaActual = texto;
    f.fixture.componentInstance.enviarMensaje();
    f.fixture.detectChanges();
  };

  it('empieza cerrado y el botón abre la ventana con el saludo', () => {
    const f = crear();
    expect(f.el.querySelector('.chat-window')).toBeNull();

    abrir(f);

    expect(f.el.querySelector('.chat-window')).not.toBeNull();
    expect(f.el.querySelectorAll('.chat-bubble').length).toBe(1); // solo el saludo
  });

  it('envía la pregunta al backend real del sitio, con el idioma, y muestra la respuesta', () => {
    const f = crear();
    abrir(f);

    escribirYEnviar(f, '  ¿Qué villas hay?  ');
    const peticion = f.http.expectOne(`${environment.apiUrl}/chat`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.pregunta).toBe('¿Qué villas hay?');
    expect(['es', 'en']).toContain(peticion.request.body.idioma);
    peticion.flush('Tenemos la Villa Samán.');
    f.fixture.detectChanges();

    const textos = Array.from(f.el.querySelectorAll('.chat-bubble p')).map(p => p.textContent?.trim());
    expect(textos).toContain('¿Qué villas hay?');
    expect(textos).toContain('Tenemos la Villa Samán.');
    expect(f.fixture.componentInstance.cargando()).toBe(false);
  });

  it('nunca llama a localhost: usa la dirección del entorno', () => {
    const f = crear();
    abrir(f);
    escribirYEnviar(f, 'hola');

    const peticion = f.http.expectOne(() => true);
    expect(peticion.request.url).toBe(`${environment.apiUrl}/chat`);
    peticion.flush('ok');
  });

  it('si el backend falla muestra un aviso amable y no el error técnico', () => {
    const f = crear();
    abrir(f);
    escribirYEnviar(f, 'hola');

    f.http.expectOne(`${environment.apiUrl}/chat`).flush(null, { status: 503, statusText: 'Service Unavailable' });
    f.fixture.detectChanges();

    const ultimo = Array.from(f.el.querySelectorAll('.chat-bubble p')).pop()?.textContent ?? '';
    expect(ultimo).toContain('WhatsApp');
    expect(ultimo).not.toContain('503');
    expect(f.fixture.componentInstance.cargando()).toBe(false);
  });

  it('si ya mandó muchas preguntas (429) se lo dice y le pide esperar', () => {
    const f = crear();
    abrir(f);
    escribirYEnviar(f, 'hola');

    f.http.expectOne(`${environment.apiUrl}/chat`).flush(null, { status: 429, statusText: 'Too Many Requests' });
    f.fixture.detectChanges();

    const ultimo = Array.from(f.el.querySelectorAll('.chat-bubble p')).pop()?.textContent ?? '';
    expect(ultimo.toLowerCase()).toMatch(/espera|wait/);
  });

  it('no envía mensajes vacíos ni una segunda pregunta mientras espera la respuesta', () => {
    const f = crear();
    abrir(f);

    escribirYEnviar(f, '   ');
    f.http.expectNone(`${environment.apiUrl}/chat`);

    escribirYEnviar(f, 'primera');
    escribirYEnviar(f, 'segunda');
    f.http.expectOne(`${environment.apiUrl}/chat`).flush('ok');
    f.http.expectNone(`${environment.apiUrl}/chat`);
  });

  const cuerpoDe = (f: ReturnType<typeof crear>) => {
    const req = f.http.expectOne(`${environment.apiUrl}/chat`);
    return { req, historial: req.request.body.historial as { rol: string; texto: string }[] | undefined };
  };

  const preguntar = (f: ReturnType<typeof crear>, texto: string, respuesta: string | null, status = 200) => {
    escribirYEnviar(f, texto);
    const { req, historial } = cuerpoDe(f);
    if (respuesta === null) req.flush(null, { status, statusText: 'Error' });
    else req.flush(respuesta);
    f.fixture.detectChanges();
    return historial;
  };

  it('la primera pregunta va sin historial y la segunda lleva la conversación (sin el saludo)', () => {
    const f = crear();
    abrir(f);

    expect(preguntar(f, 'uno', 'respuesta uno')).toBeUndefined();
    expect(preguntar(f, 'dos', 'respuesta dos')).toEqual([{ rol: 'user', texto: 'uno' }, { rol: 'model', texto: 'respuesta uno' }]);
    expect(preguntar(f, 'tres', 'r3')).toEqual([
      { rol: 'user', texto: 'uno' }, { rol: 'model', texto: 'respuesta uno' },
      { rol: 'user', texto: 'dos' }, { rol: 'model', texto: 'respuesta dos' },
    ]);
  });

  it('el historial enviado son solo los últimos 6 turnos', () => {
    const f = crear();
    abrir(f);
    for (let i = 1; i <= 5; i++) preguntar(f, `p${i}`, `r${i}`);

    const historial = preguntar(f, 'p6', 'r6')!;
    expect(historial.length).toBe(6);
    expect(historial[0]).toEqual({ rol: 'user', texto: 'p3' });
    expect(historial[5]).toEqual({ rol: 'model', texto: 'r5' });
  });

  it('los avisos de error del widget no entran al historial y la alternancia se conserva', () => {
    const f = crear();
    abrir(f);
    preguntar(f, 'uno', 'r1');
    preguntar(f, 'dos', null, 503);
    expect(f.fixture.componentInstance.mensajes().at(-1)?.error).toBe(true);

    const historial = preguntar(f, 'tres', 'r3');
    expect(historial).toEqual([{ rol: 'user', texto: 'uno' }, { rol: 'model', texto: 'r1' }]);
    const siguiente = preguntar(f, 'cuatro', 'r4')!;
    expect(siguiente.map(t => t.rol)).toEqual(['user', 'model', 'user', 'model']);
    expect(siguiente.map(t => t.texto)).toEqual(['uno', 'r1', 'tres', 'r3']);
  });

  it('el error 503 sugiere escribir por WhatsApp', () => {
    const f = crear();
    abrir(f);
    preguntar(f, 'hola', null, 503);
    expect(f.fixture.componentInstance.mensajes().at(-1)?.texto).toContain('WhatsApp');
  });

  it('nueva conversación limpia los mensajes y la siguiente pregunta va sin historial', () => {
    const f = crear();
    abrir(f);
    preguntar(f, 'uno', 'r1');
    expect(f.el.querySelectorAll('.chat-bubble').length).toBeGreaterThan(1);

    const boton = f.el.querySelector('.nueva-conversacion') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Nueva conversación');
    boton.click();
    f.fixture.detectChanges();

    expect(f.fixture.componentInstance.mensajes()).toEqual([]);
    expect(f.el.querySelectorAll('.chip').length).toBe(4);
    expect(preguntar(f, 'otra', 'ok')).toBeUndefined();
  });

  it('nueva conversación descarta una respuesta que todavía no llegó', () => {
    const f = crear();
    abrir(f);
    escribirYEnviar(f, 'uno');
    const { req } = cuerpoDe(f);

    (f.el.querySelector('.nueva-conversacion') as HTMLButtonElement).click();
    f.fixture.detectChanges();
    expect(req.cancelled).toBe(true);
    expect(f.fixture.componentInstance.cargando()).toBe(false);
    expect(f.fixture.componentInstance.mensajes()).toEqual([]);
  });

  it('con la conversación vacía muestra 4 preguntas sugeridas; al pulsar una se envía y desaparecen', () => {
    const f = crear();
    abrir(f);
    const chips = Array.from(f.el.querySelectorAll('.chip')) as HTMLButtonElement[];
    expect(chips.length).toBe(4);
    expect(chips[0].textContent?.trim()).toBe('¿Qué proyectos tienen?');

    chips[1].click();
    f.fixture.detectChanges();
    const { req } = cuerpoDe(f);
    expect(req.request.body.pregunta).toBe('¿Qué villas hay en El Encanto?');
    expect(f.el.querySelectorAll('.chip').length).toBe(0);
    req.flush('ok');
  });

  it('el saludo no cuenta como mensaje y la región de mensajes es aria-live polite', () => {
    const f = crear();
    abrir(f);
    expect(f.fixture.componentInstance.mensajes().length).toBe(0);
    expect(f.el.querySelector('.chat-body')?.getAttribute('aria-live')).toBe('polite');
  });

  it('al abrir el chat el foco va al campo de texto', async () => {
    const f = crear();
    document.body.appendChild(f.el);
    abrir(f);
    await new Promise(r => setTimeout(r));
    expect(document.activeElement).toBe(f.el.querySelector('input[name="pregunta"]'));
    f.el.remove();
  });

  it('solo aparece en las páginas públicas: no en el panel ni en el acceso', () => {
    expect(chatVisibleEn('/')).toBe(true);
    expect(chatVisibleEn('/proyectos/6/ubicacion?lote=3')).toBe(true);
    expect(chatVisibleEn('/legal/politica-datos')).toBe(true);
    expect(chatVisibleEn('/admin')).toBe(false);
    expect(chatVisibleEn('/admin/proyectos/nuevo')).toBe(false);
    expect(chatVisibleEn('/login')).toBe(false);
    expect(chatVisibleEn('/recuperar-password')).toBe(false);
    expect(chatVisibleEn('/reset-password?token=abc')).toBe(false);
    expect(chatVisibleEn('/administracion-publica')).toBe(true); // empieza igual pero no es el panel
  });
});
