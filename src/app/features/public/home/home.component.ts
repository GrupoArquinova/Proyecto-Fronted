import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ProyectoService } from '../../../core/services/proyecto.service';
import { ProyectoPublico } from '../../../core/models/proyecto.models';
import { SolicitudPublicaRequest } from '../../../core/models/solicitud.models';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { EMPRESA_INFO, SERVICIOS } from './empresa-contenido';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  private proyectoService = inject(ProyectoService);
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolicitudService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  readonly contacto = environment.contacto;
  readonly whatsappUrl = `https://wa.me/${environment.contacto.whatsapp}`;
  readonly empresa = EMPRESA_INFO;
  readonly servicios = SERVICIOS;

  proyectosList: ProyectoPublico[] = [];
  contactoForm: FormGroup;

  totalProyectos: number = 0;
  proyectosDestacados: ProyectoPublico[] = [];
  /** Proyecto marcado como destacado en el panel (se muestra arriba, con botón al asesor). */
  destacado: ProyectoPublico | null = null;
  whatsappDestacado = '';

  constructor() {
    this.contactoForm = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
      proyectoId: [null, Validators.required],
      mensaje: ['', Validators.required],
      consentimientoDatos: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.cargarCatalogo();
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
      },
      error: (err) => {
        console.error('Error al cargar los proyectos:', err);
      }
    });
  }

  /** WhatsApp con el mensaje ya escrito sobre el proyecto; no se envía nada hasta que la persona lo envíe. */
  private enlaceWhatsapp(proyecto: ProyectoPublico): string {
    const mensaje = `Hola, estoy interesado en ${proyecto.nombre} y quisiera información sobre sus tipologías, precios y disponibilidad.`;
    return `${this.whatsappUrl}?text=${encodeURIComponent(mensaje)}`;
  }

  enviarFormulario(): void {
    if (this.contactoForm.valid) {
      const datosFormulario: SolicitudPublicaRequest = {
        ...this.contactoForm.value,
        proyectoId: this.contactoForm.value.proyectoId ? Number(this.contactoForm.value.proyectoId) : null,
        userAgent: isPlatformBrowser(this.platformId) ? navigator.userAgent : ''
      };

      this.solicitudService.enviarSolicitud(datosFormulario).subscribe({
        next: () => {
          this.toastService.showSuccess('¡Solicitud enviada con éxito! Nos pondremos en contacto pronto.');
          this.contactoForm.reset();
        },
        error: (err) => {
          console.error('Error al enviar la solicitud:', err);
          this.toastService.showError('Hubo un error al enviar el mensaje. Inténtalo de nuevo.');
        }
      });

    } else {
      this.contactoForm.markAllAsTouched();
    }
  }
}
