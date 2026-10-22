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
