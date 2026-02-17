import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import { ServicoCreateRequestDTO, ServicoResponseDTO } from '../interfaces/servico.interface';

@Injectable({
  providedIn: 'root'
})
export class ServicoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<ServicoResponseDTO[]> {
    return this.http.get<ServicoResponseDTO[] | { content?: ServicoResponseDTO[] }>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.servicos}`
    ).pipe(
      map((res) => Array.isArray(res) ? res : (res?.content ?? []))
    );
  }

  buscarPorId(id: number): Observable<ServicoResponseDTO> {
    return this.http.get<ServicoResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.servicos}/${id}`
    );
  }

  criar(servico: ServicoCreateRequestDTO): Observable<ServicoResponseDTO> {
    return this.http.post<ServicoResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.servicos}`,
      servico
    );
  }

  atualizar(id: number, servico: ServicoCreateRequestDTO): Observable<ServicoResponseDTO> {
    return this.http.put<ServicoResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.servicos}/${id}`,
      servico
    );
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.servicos}/${id}`
    );
  }
}


