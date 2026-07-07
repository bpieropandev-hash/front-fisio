import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  /** Lista todas as cobranças em uma request só (filtro opcional por mês/ano de referência) */
  listar(mes?: number, ano?: number): Observable<CobrancaMensalResponseDTO[]> {
    let params = new HttpParams();
    if (mes != null) params = params.set('mes', mes);
    if (ano != null) params = params.set('ano', ano);
    return this.http.get<CobrancaMensalResponseDTO[]>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.cobrancas}`,
      { params }
    );
  }

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


