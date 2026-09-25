import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private http = inject(HttpClient);

  // Configura tus datos de Cloudinary
  private cloudName = 'dn3s7utod'; 
  private uploadPreset = 'construtora_present'; 
  private cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  subirImagen(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    // Hace el POST a Cloudinary y extrae únicamente la URL segura (secure_url)
    return this.http.post<any>(this.cloudinaryUrl, formData).pipe(
      map(response => response.secure_url)
    );
  }
}