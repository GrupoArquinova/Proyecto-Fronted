import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ProyectoService } from '../../../core/services/proyecto.service';
import { LoteService } from '../../../core/services/lote.service';
import { SolicitudService } from '../../../core/services/solicitud.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  
  // Inyección de dependencias
  private proyectoService = inject(ProyectoService);
  private loteService = inject(LoteService);
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolicitudService);
  
  proyectosList: any[] = [];
  contactoForm: FormGroup;

  // Variables dinámicas para el contador
  anosExperiencia: number = 15;
  totalProyectos: number = 0;
  totalLotes: number = 0;
  infraestructuraPorcentaje: number = 100;
  proyectosDestacados: any[] = [];

  private animacionEjecutada = false;

  constructor() {
    // Inicialización del formulario reactivo con el campo proyectoId requerido
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
    this.cargarProyectos();
    this.cargarDatosReales();
  }

  cargarProyectos(): void {
    this.proyectoService.getProyectos().subscribe({
      next: (data: any) => {
        this.proyectosList = data;
      },
      error: (err: any) => {
        console.error('Error cargando proyectos para el select', err);
      }
    });
  }

  cargarDatosReales(): void {
    forkJoin({
      proyectos: this.proyectoService.getProyectos(),
      lotes: this.loteService.obtenerLotes()
    }).subscribe({
      next: (resultado: any) => {
        const todosLosProyectos = resultado.proyectos || [];
        const todosLosLotes = resultado.lotes || [];

        const proyectosConDetalles = todosLosProyectos.map((proyecto: any) => {
          const lotesDelProyecto = todosLosLotes.filter((lote: any) => 
            lote.proyectoId === proyecto.id || lote.proyecto?.id === proyecto.id
          );

          const totalLotes = lotesDelProyecto.length;
          const lotesDisponibles = lotesDelProyecto.filter((lote: any) => 
            lote.estado === 'DISPONIBLE' || lote.estadoId === 1 || lote.disponible === true
          ).length;

          return {
            ...proyecto,
            totalLotes: totalLotes,
            lotesDisponibles: lotesDisponibles,
            imagenUrl: proyecto.imagenUrl || 'assets/images/default-project.jpg',
            estado: proyecto.estado || 'EN VENTA',
            ubicacion: proyecto.ubicacion || 'COLOMBIA',
            descripcion: proyecto.descripcion || 'Proyecto campestre diseñado para quienes buscan tranquilidad, naturaleza y alta plusvalía.'
          };
        });

        this.proyectosDestacados = proyectosConDetalles.slice(0, 3);
        this.totalProyectos = todosLosProyectos.length;
        this.totalLotes = todosLosLotes.length;
      },
      error: (err) => {
        console.error('Error al cargar las estadísticas de proyectos y lotes:', err);
        this.totalProyectos = 3;
        this.totalLotes = 108;
      }
    });
  }

  ngAfterViewInit(): void {
    this.configurarObserverAnimacion();
  }

 enviarFormulario(): void {
  if (this.contactoForm.valid) {
    const datosFormulario = {
      ...this.contactoForm.value,
      proyectoId: this.contactoForm.value.proyectoId ? Number(this.contactoForm.value.proyectoId) : null,
      userAgent: navigator.userAgent
    };

    this.solicitudService.enviarSolicitud(datosFormulario).subscribe({
      next: (response) => {
        console.log('Solicitud guardada con éxito en el backend:', response);
        alert('¡Solicitud enviada con éxito! Nos pondremos en contacto pronto.');
        this.contactoForm.reset();
      },
      error: (err) => {
        console.error('Error al enviar la solicitud:', err);
        alert('Hubo un error al enviar el mensaje. Inténtalo de nuevo.');
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
        if (entry.isIntersecting && !this.animacionEjecutada) {
          this.animacionEjecutada = true;
          this.iniciarConteoAnimado();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(bannerElement);
  }

  iniciarConteoAnimado(): void {
    this.animarValor('anosExperiencia', 0, this.anosExperiencia, 1500);
    this.animarValor('totalProyectos', 0, this.totalProyectos, 1500);
    this.animarValor('totalLotes', 0, this.totalLotes, 2000);
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

      if (progreso < 1) {
        window.requestAnimationFrame(paso);
      } else {
        if (propiedad === 'anosExperiencia') this.anosExperiencia = fin;
        if (propiedad === 'totalProyectos') this.totalProyectos = fin;
        if (propiedad === 'totalLotes') this.totalLotes = fin;
      }
    };

    window.requestAnimationFrame(paso);
  }
}