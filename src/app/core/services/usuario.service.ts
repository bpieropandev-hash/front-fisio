import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  UsuarioMeResponseDTO,
  AtualizarUsuarioRequestDTO,
  UploadFotoRequestDTO
} from '../interfaces/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.usuarios}`;

  constructor(private http: HttpClient) {}

  buscarMe(): Observable<UsuarioMeResponseDTO> {
    return this.http.get<UsuarioMeResponseDTO>(`${this.baseUrl}/me`);
  }

  atualizarMe(dados: AtualizarUsuarioRequestDTO): Observable<UsuarioMeResponseDTO> {
    return this.http.put<UsuarioMeResponseDTO>(`${this.baseUrl}/me`, dados);
  }

  atualizarFoto(fotoBase64: string): Observable<UsuarioMeResponseDTO> {
    const body: UploadFotoRequestDTO = { fotoBase64 };
    return this.http.put<UsuarioMeResponseDTO>(`${this.baseUrl}/me/foto`, body);
  }
}
