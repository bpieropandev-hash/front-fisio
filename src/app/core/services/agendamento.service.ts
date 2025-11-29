import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  AgendamentoRequestDTO,
  AtendimentoUpdateRequestDTO,
  AtendimentoResponseDTO
} from '../interfaces/agendamento.interface';

@Injectable({
  providedIn: 'root'
})
export class AgendamentoService {
  constructor(private http: HttpClient) {}

  listar(params?: {
    dataInicio?: string;
    dataFim?: string;
    pacienteId?: number;
  }): Observable<AtendimentoResponseDTO[]> {
    let httpParams = new HttpParams();
    
    if (params?.dataInicio) {
      httpParams = httpParams.set('dataInicio', params.dataInicio);
    }
    if (params?.dataFim) {
      httpParams = httpParams.set('dataFim', params.dataFim);
    }
    if (params?.pacienteId) {
      httpParams = httpParams.set('pacienteId', params.pacienteId.toString());
    }

    return this.http.get<AtendimentoResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.agendamentos}`,
      { params: httpParams }
    );
  }

  buscarPorId(id: number): Observable<AtendimentoResponseDTO> {
    return this.http.get<AtendimentoResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.agendamentos}/${id}`
    );
  }

  criar(agendamento: AgendamentoRequestDTO): Observable<AtendimentoResponseDTO[]> {
    return this.http.post<AtendimentoResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.agendamentos}`,
      agendamento
    );
  }

  atualizar(id: number, atualizacao: AtendimentoUpdateRequestDTO): Observable<AtendimentoResponseDTO> {
    return this.http.put<AtendimentoResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.agendamentos}/${id}`,
      atualizacao
    );
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.agendamentos}/${id}`
    );
  }
}


