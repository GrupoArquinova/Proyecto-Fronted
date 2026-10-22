import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { MedioComponent } from './medio.component';

function crear(url: string, titulo = 'Recorrido', completo?: boolean) {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(MedioComponent);
  fixture.componentRef.setInput('url', url);
  fixture.componentRef.setInput('titulo', titulo);
  if (completo !== undefined) fixture.componentRef.setInput('completo', completo);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, c: fixture.componentInstance };
}

describe('MedioComponent', () => {
  it('una imagen se muestra con su texto alternativo y carga diferida', () => {
    const { el } = crear('https://res.cloudinary.com/x/image/upload/v1/foto.jpg', 'La foto');
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://res.cloudinary.com/x/image/upload/v1/foto.jpg');
    expect(img.alt).toBe('La foto');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(el.querySelector('iframe, video, a')).toBeNull();
  });

  it('un video se muestra con controles y su título accesible', () => {
    const { el } = crear('https://x.com/clip.mp4', 'El clip');
    const video = el.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('https://x.com/clip.mp4');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.getAttribute('aria-label')).toBe('El clip');
  });

  it('un video de YouTube se incrusta con el reproductor sin cookies y permisos de pantalla completa', () => {
    const { el, c } = crear('https://www.youtube.com/watch?v=abc123', 'Mi video');
    const iframe = el.querySelector('iframe')!;
    expect(c.clasificado().tipo).toBe('incrustado');
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(iframe.title).toBe('Mi video');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(el.querySelector('a')).toBeNull();
  });

  it('un tour de Matterport se incrusta tal cual', () => {
    const { el } = crear('https://my.matterport.com/show/?m=xyz', 'Tour');
    expect(el.querySelector('iframe')?.getAttribute('src')).toBe('https://my.matterport.com/show/?m=xyz');
  });

  it('un PDF de Cloudinary se muestra en un visor y con un enlace para abrirlo en otra pestaña', () => {
    const { el } = crear('https://res.cloudinary.com/x/raw/upload/v1/ficha.pdf', 'La ficha');
    expect(el.querySelector('iframe')?.getAttribute('src')).toBe('https://res.cloudinary.com/x/raw/upload/v1/ficha.pdf');
    const enlace = el.querySelector<HTMLAnchorElement>('a.enlace')!;
    expect(enlace.textContent?.trim()).toBe('Abrir La ficha en una pestaña nueva');
    expect(enlace.getAttribute('href')).toBe('https://res.cloudinary.com/x/raw/upload/v1/ficha.pdf');
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('el iframe del PDF no lleva sandbox (Chrome bloquea su visor de PDF)', () => {
    const pdf = crear('https://res.cloudinary.com/x/raw/upload/v1/ficha.pdf').el.querySelector('iframe')!;
    expect(pdf.hasAttribute('sandbox')).toBe(false);
  });

  it('el iframe de tours y reproductores lleva sandbox con solo los permisos necesarios', () => {
    const tour = crear('https://my.matterport.com/show/?m=xyz').el.querySelector('iframe')!;
    const permisos = (tour.getAttribute('sandbox') ?? '').split(' ');
    expect(permisos).toEqual(expect.arrayContaining(['allow-scripts', 'allow-same-origin', 'allow-popups', 'allow-presentation']));
    expect(permisos).not.toContain('allow-top-navigation');
    expect(permisos).not.toContain('allow-forms');
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://my.matterport.com/show/?m=1',
    'https://sitio-no-listado.com/tour',
    'https://evil.com/?u=https://my.matterport.com/'
  ])('una URL hostil o no permitida (%s) nunca llega a un iframe', url => {
    const { el, c } = crear(url, 'Intruso');
    expect(c.clasificado().tipo).toBe('enlace');
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('un PDF de otro sitio no se incrusta: queda como enlace externo seguro', () => {
    const { el } = crear('https://ejemplo.com/ficha.pdf', 'La ficha');
    expect(el.querySelector('iframe')).toBeNull();
    const enlace = el.querySelector<HTMLAnchorElement>('a.enlace')!;
    expect(enlace.textContent?.replace(/\s+/g, ' ').trim()).toBe('Abrir La ficha →');
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer');
    expect(enlace.getAttribute('target')).toBe('_blank');
  });

  it('una dirección que no se puede incrustar (o no es https) se ofrece como enlace', () => {
    const { el } = crear('http://ejemplo.com/tour', 'El tour');
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.querySelector('a.enlace')?.getAttribute('href')).toBe('http://ejemplo.com/tour');
  });

  it('un enlace normal de Google Maps no se incrusta', () => {
    const { el } = crear('https://www.google.com/maps/place/algo', 'Mapa');
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.querySelector('a.enlace')).not.toBeNull();
  });

  it('la clase "completo" del anfitrión sigue el input', () => {
    const { fixture, el } = crear('https://x.com/clip.mp4', 'El clip', true);
    expect(el.classList.contains('completo')).toBe(true);
    fixture.componentRef.setInput('completo', false);
    fixture.detectChanges();
    expect(el.classList.contains('completo')).toBe(false);
  });

  it('el visor reacciona al cambio de URL', () => {
    const { fixture, el } = crear('https://x.com/clip.mp4');
    expect(el.querySelector('video')).not.toBeNull();
    fixture.componentRef.setInput('url', 'https://x.com/foto.png');
    fixture.detectChanges();
    expect(el.querySelector('video')).toBeNull();
    expect(el.querySelector('img')).not.toBeNull();
  });

  it('el título es vacío por defecto', () => {
    TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
    const fixture = TestBed.createComponent(MedioComponent);
    fixture.componentRef.setInput('url', 'https://x.com/foto.png');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img').alt).toBe('');
    expect(fixture.componentInstance.embedSeguro()).toBeNull();
  });
});
