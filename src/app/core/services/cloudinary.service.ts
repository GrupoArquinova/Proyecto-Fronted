import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap, throwError } from 'rxjs';
import { ArchivoInvalidoError, TipoArchivo, validarContenidoArchivo } from '../utils/archivos';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResult {
  url: string;
  resourceType: string; // 'image', 'video', 'raw'
}

/** Campos de la respuesta de Cloudinary que usamos. */
interface CloudinaryUploadResponse {
  secure_url: string;
  resource_type: string;
}

/** Respuesta de POST /api/cloudinary/firma (backend). */
interface CloudinaryFirma {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Subidas firmadas a Cloudinary:
 * 1. Se pide una firma al backend (requiere sesión de ADMINISTRADOR; el JWT lo agrega el interceptor).
 * 2. El navegador sube el archivo directo a Cloudinary con esa firma.
 * El API secret nunca llega al navegador y nadie sin sesión puede subir archivos.
 */
@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private http = inject(HttpClient);
  private firmaUrl = `${environment.apiUrl}/cloudinary/firma`;

  /** Mantenido por compatibilidad con proyectos.component.ts (solo imágenes) */
  subirImagen(file: File): Observable<string> {
    return this.subirArchivo(file, ['imagen']).pipe(map(res => res.url));
  }

  /**
   * Sube una imagen, un video o un PDF. Antes de pedir la firma se valida el archivo (lista cerrada de tipos, sin SVG,
   * tamaño y magic bytes); si no pasa, el Observable falla con ArchivoInvalidoError y no sale nada hacia Cloudinary.
   */
  subirArchivo(file: File, permitidos: TipoArchivo[] = ['imagen', 'video', 'pdf']): Observable<CloudinaryUploadResult> {
    return from(validarContenidoArchivo(file, permitidos)).pipe(
      switchMap(problema => problema
        ? throwError(() => new ArchivoInvalidoError(problema))
        : this.http.post<CloudinaryFirma>(this.firmaUrl, {})),
      switchMap(firma => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', firma.apiKey);
        formData.append('timestamp', String(firma.timestamp));
        formData.append('signature', firma.signature);
        if (firma.folder) {
          formData.append('folder', firma.folder);
        }

        // 'auto' detecta el tipo de recurso (imagen, video, pdf, etc.) automáticamente
        const uploadUrl = `https://api.cloudinary.com/v1_1/${firma.cloudName}/auto/upload`;
        return this.http.post<CloudinaryUploadResponse>(uploadUrl, formData);
      }),
      map(response => ({
        url: response.secure_url,
        resourceType: response.resource_type
      }))
    );
  }
}
