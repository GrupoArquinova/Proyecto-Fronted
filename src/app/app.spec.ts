import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { provideI18nPruebas } from './i18n/pruebas';
import { SeoService } from './core/services/seo.service';

@Component({ standalone: true, template: '<p>página</p>' })
class PaginaPrueba {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: PaginaPrueba },
          { path: 'proyectos', component: PaginaPrueba, data: { seo: { titulo: 'Proyectos de prueba' } } },
          { path: 'login', component: PaginaPrueba },
          { path: 'admin', component: PaginaPrueba, children: [{ path: 'resumen', component: PaginaPrueba, data: { seo: { titulo: 'Resumen' } } }] }
        ]),
        provideHttpClient(),
        provideI18nPruebas()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the global router outlet and widgets', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-toast')).toBeTruthy();
    expect(compiled.querySelector('app-confirm-dialog')).toBeTruthy();
  });

  it('el botón de WhatsApp está en el sitio público y no en el login ni en el panel', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const el = fixture.nativeElement as HTMLElement;

    await router.navigateByUrl('/');
    fixture.detectChanges();
    expect(el.querySelector('app-whatsapp-modal')).not.toBeNull();

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    expect(el.querySelector('app-whatsapp-modal')).toBeNull();

    await router.navigateByUrl('/proyectos');
    fixture.detectChanges();
    expect(el.querySelector('app-whatsapp-modal')).not.toBeNull();

    await router.navigateByUrl('/admin/resumen');
    fixture.detectChanges();
    expect(el.querySelector('app-whatsapp-modal')).toBeNull();
  });

  it('al navegar toma el título de la ruta más profunda que lo declare', async () => {
    const seo = TestBed.inject(SeoService);
    const establecer = vi.spyOn(seo, 'establecer');
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/proyectos');
    expect(establecer).toHaveBeenLastCalledWith({ titulo: 'Proyectos de prueba' });

    await router.navigateByUrl('/admin/resumen');
    expect(establecer).toHaveBeenLastCalledWith({ titulo: 'Resumen' });

    establecer.mockClear();
    await router.navigateByUrl('/login'); // sin datos de SEO: no se cambia nada
    expect(establecer).not.toHaveBeenCalled();
  });
});
