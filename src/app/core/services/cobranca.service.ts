import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  CobrancaMensalUpdateRequestDTO,
  CobrancaMensalResponseDTO,
  GerarCobrancasRequestDTO
} from '../interfaces/cobranca.interface';

@Injectable({
  providedIn: 'root'
})
export class CobrancaService {
  constructor(private http: HttpClient) {}

  buscarPorId(id: number): Observable<CobrancaMensalResponseDTO> {
    return this.http.get<CobrancaMensalResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.cobrancas}/${id}`
    );
  }

  listarPorAssinatura(assinaturaId: number): Observable<CobrancaMensalResponseDTO[]> {
    return this.http.get<CobrancaMensalResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.cobrancas}/assinatura/${assinaturaId}`
    );
  }

  atualizar(id: number, atualizacao: CobrancaMensalUpdateRequestDTO): Observable<CobrancaMensalResponseDTO> {
    return this.http.put<CobrancaMensalResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.cobrancas}/${id}`,
      atualizacao
    );
  }

  gerarMensalidades(request: GerarCobrancasRequestDTO): Observable<any> {
    return this.http.post(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.financeiro}/gerar-mensalidades`,
      request
    );
  }
}


