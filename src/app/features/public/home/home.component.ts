import { Component, OnInit, effect, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocalizadoPipe } from '../../../shared/pipes/localizado.pipe';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ProyectoService } from '../../../core/services/proyecto.service';
import { ProyectoPublico } from '../../../core/models/proyecto.models';
import { SolicitudPublicaRequest } from '../../../core/models/solicitud.models';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { EMPRESA_INFO, SERVICIOS } from './empresa-contenido';
import { alMenosUnMedioDeContacto } from '../../../core/utils/solicitudes';
import { SeoService } from '../../../core/services/seo.service';
import { ContenidoService } from '../../../core/services/contenido.service';
import { BloqueIdentidad, bloquesDeIdentidad } from './identidad';

import { IdiomaService } from '../../../core/services/idioma.service';
import { SelectorIdiomaComponent } from '../../../shared/components/selector-idioma/selector-idioma.component';
import { BotonPantallaCompletaComponent } from '../../../shared/components/boton-pantalla-completa/boton-pantalla-completa.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoPipe, LocalizadoPipe, SelectorIdiomaComponent, BotonPantallaCompletaComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  private proyectoService = inject(ProyectoService);
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolicitudService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private seo = inject(SeoService);
  private contenidoService = inject(ContenidoService);
  private idioma = inject(IdiomaService);

  readonly contacto = environment.contacto;
  readonly whatsappUrl = `https://wa.me/${environment.contacto.whatsapp}`;
  readonly empresa = EMPRESA_INFO;
  readonly servicios = SERVICIOS;

  proyectosList: ProyectoPublico[] = [];
  /** Misión, visión y valores publicados en el panel (vacío mientras la empresa no los apruebe). */
  identidad: BloqueIdentidad[] = [];
  contactoForm: FormGroup;

  totalProyectos: number = 0;
  proyectosDestacados: ProyectoPublico[] = [];
  /** Proyecto marcado como destacado en el panel (se muestra arriba, con botón al asesor). */
  destacado: ProyectoPublico | null = null;
  whatsappDestacado = '';

  constructor() {
    this.contactoForm = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.email]],
      telefono: [''],
      proyectoId: [null],
      servicioInteres: [''],
      mensaje: [''],
      consentimientoDatos: [false, Validators.requiredTrue]
    }, { validators: alMenosUnMedioDeContacto });

    // Los textos de SEO se vuelven a poner cuando cambia el idioma
    effect(() => this.ponerSeo());
  }

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  private ponerSeo(): void {
    this.seo.establecer({
      titulo: this.idioma.t('home.titulo'),
      descripcion: this.idioma.t('home.empresa.parrafo1'),
      ruta: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: this.empresa.nombre,
        taxID: this.empresa.nit,
        url: this.seo.urlAbsoluta('/') ?? undefined,
        email: this.contacto.correo,
        telephone: this.contacto.telefonoTexto,
        address: {
          '@type': 'PostalAddress',
          streetAddress: this.empresa.oficina,
          addressLocality: 'Armenia',
          addressRegion: 'Quindío',
          addressCountry: 'CO'
        }
      }
    });
  }

  /** Una sola consulta: alimenta el select del formulario y las tarjetas destacadas. */
  cargarCatalogo(): void {
    this.proyectoService.obtenerCatalogoPublico().subscribe({
      next: ({ proyectos }) => {
        this.proyectosList = proyectos;
        this.proyectosDestacados = proyectos.slice(0, 3);
        this.destacado = proyectos.find(p => p.destacado) ?? null;
        this.whatsappDestacado = this.destacado ? this.enlaceWhatsapp(this.destacado) : '';
        this.totalProyectos = proyectos.length;
        this.cargarIdentidad(proyectos[0]?.empresaId ?? environment.empresaId);
      },
      error: (err) => {
        console.error('Error al cargar los proyectos:', err);
        this.cargarIdentidad(environment.empresaId);
      }
    });
  }

  /** Solo se piden y muestran los textos que el administrador dejó publicados. */
  private cargarIdentidad(empresaId: number): void {
    this.contenidoService.obtenerPublicadosPorEmpresa(empresaId).subscribe({
      next: (contenidos) => this.identidad = bloquesDeIdentidad(contenidos),
      error: () => this.identidad = []
    });
  }

  /** WhatsApp con el mensaje ya escrito sobre el proyecto; no se envía nada hasta que la persona lo envíe. */
  private enlaceWhatsapp(proyecto: ProyectoPublico): string {
    const mensaje = this.idioma.t('home.destacado.whatsapp', { nombre: proyecto.nombre });
    return `${this.whatsappUrl}?text=${encodeURIComponent(mensaje)}`;
  }

  enviarFormulario(): void {
    if (this.contactoForm.valid) {
      const datosFormulario: SolicitudPublicaRequest = {
        ...this.contactoForm.value,
        proyectoId: this.contactoForm.value.proyectoId ? Number(this.contactoForm.value.proyectoId) : null,
        servicioInteres: this.contactoForm.value.servicioInteres || undefined,
        userAgent: isPlatformBrowser(this.platformId) ? navigator.userAgent : ''
      };

      this.solicitudService.enviarSolicitud(datosFormulario).subscribe({
        next: () => {
          this.toastService.showSuccess(this.idioma.t('home.formulario.exito'));
          this.contactoForm.reset();
        },
        error: (err) => {
          console.error('Error al enviar la solicitud:', err);
          this.toastService.showError(this.idioma.t('home.formulario.error'));
        }
      });

    } else {
      this.contactoForm.markAllAsTouched();
    }
  }
}
