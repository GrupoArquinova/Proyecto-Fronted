import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContenidoService } from '../../../core/services/contenido.service';
import { ContenidoInstitucional } from '../../../core/models/contenido.models';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-contenido-institucional',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contenido.component.html',
  styleUrls: ['./contenido.component.scss']
})
export class ContenidoInstitucionalComponent implements OnInit {
  private contenidoService = inject(ContenidoService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  empresaId = 1;
  secciones: ContenidoInstitucional[] = [];
  cargando = false;
  cargandoCrear = false;

  mostrarFormularioNuevo = false;
  nuevaSeccion = {
    seccion: '',
    titulo: '',
    contenido: '',
    tituloEn: '',
    contenidoEn: '',
    publicado: true
  };

  ngOnInit(): void {
    this.cargarContenidos();
  }

  cargarContenidos(): void {
    this.cargando = true;
    this.contenidoService.obtenerContenidosPorEmpresa(this.empresaId).subscribe({
      next: (data) => {
        this.secciones = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar contenidos institucionales:', err);
        this.toastService.showError('Error al cargar contenidos');
        this.cargando = false;
      }
    });
  }

  toggleFormularioNuevo(): void {
    this.mostrarFormularioNuevo = !this.mostrarFormularioNuevo;
    if (this.mostrarFormularioNuevo) {
      this.nuevaSeccion = { seccion: '', titulo: '', contenido: '', tituloEn: '', contenidoEn: '', publicado: true };
    }
  }

  guardarNuevaSeccion(): void {
    if (!this.nuevaSeccion.seccion || !this.nuevaSeccion.titulo || !this.nuevaSeccion.contenido) {
      this.toastService.showInfo('Por favor completa todos los campos obligatorios.');
      return;
    }

    this.cargandoCrear = true;
    const payload = {
      empresaId: this.empresaId,
      seccion: this.nuevaSeccion.seccion.trim().toUpperCase(),
      titulo: this.nuevaSeccion.titulo.trim(),
      contenido: this.nuevaSeccion.contenido.trim(),
      tituloEn: this.nuevaSeccion.tituloEn.trim(),
      contenidoEn: this.nuevaSeccion.contenidoEn.trim(),
      publicado: this.nuevaSeccion.publicado
    };

    this.contenidoService.guardarSeccion(payload).subscribe({
      next: (resp) => {
        this.toastService.showSuccess(`Sección "${resp.titulo}" creada exitosamente.`);
        this.cargandoCrear = false;
        this.mostrarFormularioNuevo = false;
        this.cargarContenidos();
      },
      error: (err) => {
        console.error('Error al crear sección:', err);
        this.cargandoCrear = false;
        const errorMsg = err.error?.message || 'Error al crear la sección. Verifica que no esté duplicada.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  guardarSeccion(seccion: ContenidoInstitucional): void {
    if (!seccion.id) return;

    this.contenidoService.actualizarSeccion(seccion.id, {
      empresaId: this.empresaId,
      seccion: seccion.seccion,
      titulo: seccion.titulo,
      contenido: seccion.contenido,
      tituloEn: seccion.tituloEn ?? '',
      contenidoEn: seccion.contenidoEn ?? '',
      publicado: seccion.publicado
    }).subscribe({
      next: (resp) => {
        this.toastService.showSuccess(`Sección "${seccion.titulo}" actualizada correctamente.`);
        Object.assign(seccion, resp);
      },
      error: (err) => {
        console.error('Error al actualizar sección:', err);
        this.toastService.showError('Error al actualizar los cambios.');
      }
    });
  }

  async eliminarSeccion(seccion: ContenidoInstitucional): Promise<void> {
    if (!seccion.id) return;
    const ok = await this.confirmDialog.open({
      title: 'Eliminar Sección',
      message: `¿Estás seguro de que deseas eliminar "${seccion.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });
    if (!ok) return;
    this.contenidoService.eliminarSeccion(seccion.id).subscribe({
      next: () => {
        this.toastService.showSuccess(`Sección "${seccion.titulo}" eliminada correctamente.`);
        this.cargarContenidos();
      },
      error: (err) => {
        console.error('Error al eliminar sección:', err);
        this.toastService.showError('Error al intentar eliminar la sección.');
      }
    });
  }

}