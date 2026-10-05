import { Component, OnInit, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ProyectoService } from '../../../core/services/proyecto.service';
import { ProyectoPublico } from '../../../core/models/proyecto.models';
import { SolicitudPublicaRequest } from '../../../core/models/solicitud.models';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {

  private proyectoService = inject(ProyectoService);
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolicitudService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  readonly contacto = environment.contacto;
  readonly whatsappUrl = `https://wa.me/${environment.contacto.whatsapp}`;

  proyectosList: ProyectoPublico[] = [];
  contactoForm: FormGroup;

  // Variables dinámicas para el contador (arrancan en 0, se animan hasta su valor real)
  anosExperiencia: number = 0;
  totalProyectos: number = 0;
  totalLotes: number = 0;
  infraestructuraPorcentaje: number = 0;
  proyectosDestacados: ProyectoPublico[] = [];

  // Valores finales hacia los que debe animarse cada contador
  private anosExperienciaFinal: number = 15;
  private infraestructuraPorcentajeFinal: number = 100;

  // --- Control de la animación del contador ---
  private animacionEjecutada = false;
  private statsVisibles = false;
  private datosListos = false;

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

  /** Una sola consulta: alimenta el select del formulario, las tarjetas destacadas y los contadores. */
  cargarCatalogo(): void {
    this.proyectoService.obtenerCatalogoPublico().subscribe({
      next: ({ proyectos, totalLotes }) => {
        this.proyectosList = proyectos;
        this.proyectosDestacados = proyectos.slice(0, 3);
        this.totalProyectos = proyectos.length;
        this.totalLotes = totalLotes;

        this.datosListos = true;
        this.intentarIniciarConteo();
      },
      error: (err) => {
        console.error('Error al cargar las estadísticas de proyectos y lotes:', err);
        this.totalProyectos = 3;
        this.totalLotes = 108;

        this.datosListos = true;
        this.intentarIniciarConteo();
      }
    });
  }

  ngAfterViewInit(): void {
    // IntersectionObserver y requestAnimationFrame solo existen en el navegador (la pagina se renderiza en servidor)
    if (isPlatformBrowser(this.platformId)) {
      this.configurarObserverAnimacion();
    }
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

  configurarObserverAnimacion(): void {
    const bannerElement = document.querySelector('.stats-banner');
    if (!bannerElement) return;

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.statsVisibles = true;
          this.intentarIniciarConteo();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(bannerElement);
  }

  /**
   * Solo inicia la animación cuando el banner ya es visible EN PANTALLA
   * y los datos del backend YA llegaron. No importa cuál de las dos
   * condiciones se cumpla primero: la animación espera a la que falte.
   */
  private intentarIniciarConteo(): void {
    if (this.statsVisibles && this.datosListos && !this.animacionEjecutada) {
      this.animacionEjecutada = true;
      this.iniciarConteoAnimado();
    }
  }

  iniciarConteoAnimado(): void {
    this.animarValor('anosExperiencia', 0, this.anosExperienciaFinal, 1500);
    this.animarValor('totalProyectos', 0, this.totalProyectos, 1500);
    this.animarValor('totalLotes', 0, this.totalLotes, 2000);
    this.animarValor('infraestructuraPorcentaje', 0, this.infraestructuraPorcentajeFinal, 1800);
  }

  animarValor(propiedad: string, inicio: number, fin: number, duracion: number): void {
    let tiempoInicio: number | null = null;

    const paso = (tiempoActual: number) => {
      if (!tiempoInicio) tiempoInicio = tiempoActual;
      const progreso = Math.min((tiempoActual - tiempoInicio) / duracion, 1);
      const valorActual = Math.floor(progreso * (fin - inicio) + inicio);

      if (propiedad === 'anosExperiencia') this.anosExperiencia = valorActual;
      if (propiedad === 'totalProyectos') this.totalProyectos = valorActual;
      if (propiedad === 'totalLotes') this.totalLotes = valorActual;
      if (propiedad === 'infraestructuraPorcentaje') this.infraestructuraPorcentaje = valorActual;

      if (progreso < 1) {
        window.requestAnimationFrame(paso);
      } else {
        if (propiedad === 'anosExperiencia') this.anosExperiencia = fin;
        if (propiedad === 'totalProyectos') this.totalProyectos = fin;
        if (propiedad === 'totalLotes') this.totalLotes = fin;
        if (propiedad === 'infraestructuraPorcentaje') this.infraestructuraPorcentaje = fin;
      }
    };

    window.requestAnimationFrame(paso);
  }
}