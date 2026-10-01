import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface CloudinaryUploadResult {
  url: string;
  resourceType: string; // 'image', 'video', 'raw'
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private http = inject(HttpClient);

  private cloudName = 'dn3s7utod';
  private uploadPreset = 'construtora_present';
  // 'auto' detecta el tipo de recurso (imagen, video, pdf, etc.) automáticamente
  private cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`;

  /** Mantenido por compatibilidad con proyectos.component.ts (solo imágenes) */
  subirImagen(file: File): Observable<string> {
    return this.subirArchivo(file).pipe(map(res => res.url));
  }

  /** Sube cualquier tipo de archivo: imagen, video, pdf, etc. */
  subirArchivo(file: File): Observable<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http.post<any>(this.cloudinaryUrl, formData).pipe(
      map(response => ({
        url: response.secure_url,
        resourceType: response.resource_type
      }))
    );
  }
}