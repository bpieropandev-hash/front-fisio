import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  AssinaturaCreateRequestDTO,
  AssinaturaResponseDTO
} from '../interfaces/assinatura.interface';

@Injectable({
  providedIn: 'root'
})
export class AssinaturaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<AssinaturaResponseDTO[]> {
    return this.http.get<AssinaturaResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.assinaturas}`
    );
  }

  buscarPorId(id: number): Observable<AssinaturaResponseDTO> {
    return this.http.get<AssinaturaResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.assinaturas}/${id}`
    );
  }

  listarPorPaciente(pacienteId: number): Observable<AssinaturaResponseDTO[]> {
    return this.http.get<AssinaturaResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.assinaturas}/paciente/${pacienteId}`
    );
  }

  criar(assinatura: AssinaturaCreateRequestDTO): Observable<AssinaturaResponseDTO[]> {
    return this.http.post<AssinaturaResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.assinaturas}`,
      assinatura
    );
  }

  cancelar(id: number): Observable<void> {
    return this.http.put<void>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.assinaturas}/${id}/cancelar`,
      {}
    );
  }
}


