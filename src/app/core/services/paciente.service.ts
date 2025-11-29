import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { PacienteCreateRequestDTO, PacienteResponseDTO } from '../interfaces/paciente.interface';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  constructor(private http: HttpClient) {}

  listar(): Observable<PacienteResponseDTO[]> {
    return this.http.get<PacienteResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pacientes}`
    );
  }

  buscarPorId(id: number): Observable<PacienteResponseDTO> {
    return this.http.get<PacienteResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pacientes}/${id}`
    );
  }

  criar(paciente: PacienteCreateRequestDTO): Observable<PacienteResponseDTO> {
    return this.http.post<PacienteResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pacientes}`,
      paciente
    );
  }

  atualizar(id: number, paciente: PacienteCreateRequestDTO): Observable<PacienteResponseDTO> {
    return this.http.put<PacienteResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pacientes}/${id}`,
      paciente
    );
  }
}


