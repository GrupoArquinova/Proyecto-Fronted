import { Component, inject } from '@angular/core';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { ProyectoService } from '../../../../core/services/proyecto.service';

@Component({
  selector: 'app-crear-proyecto',
  templateUrl: './crear-proyecto.component.html'
})
export class CrearProyectoComponent {
  private cloudinaryService = inject(CloudinaryService);
  private proyectoService = inject(ProyectoService);

  imagenSeleccionada: File | null = null;
  nombreProyecto: string = '';
  cargando: boolean = false;

  // Se ejecuta cuando el usuario selecciona un archivo en el <input type="file">
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.imagenSeleccionada = file;
    }
  }

  guardarProyecto(): void {
    if (!this.imagenSeleccionada || !this.nombreProyecto) return;

    this.cargando = true;

    // Paso A: Subir la foto a Cloudinary
    this.cloudinaryService.subirImagen(this.imagenSeleccionada).subscribe({
      next: (urlObtenida: string) => {
        
        // Paso B: Enviar la URL en texto plano a Spring Boot
        const nuevoProyecto = {
          nombre: this.nombreProyecto,
          imagenUrl: urlObtenida // 👈 Texto: "https://res.cloudinary.com/..."
        };

        this.proyectoService.crearProyecto(nuevoProyecto).subscribe({
          next: () => {
            alert('Proyecto guardado con éxito');
            this.cargando = false;
          },
          error: (err) => console.error('Error al guardar en BD', err)
        });

      },
      error: (err) => {
        console.error('Error al subir imagen a Cloudinary', err);
        this.cargando = false;
      }
    });
  }
}