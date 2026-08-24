import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import {
  CobrancaMensalUpdateRequestDTO,
  CobrancaMensalResponseDTO,
  GerarCobrancasRequestDTO
} from '../interfaces/cobranca.interface';
import { PaginaResponse } from '../interfaces/pagina.interface';

@Injectable({
  providedIn: 'root'
})
export class CobrancaService {
  // Backend agora pagina (P1.3). A tela filtra/busca em cima da lista carregada
  // (client-side, ver cobrancas.component), então pedimos uma página grande o
  // suficiente pra cobrir o volume real de uma clínica pequena numa request só,
  // em vez de virar navegação por página. Se algum dia estourar, aí sim vira
  // paginação de verdade na UI.
  private static readonly TAMANHO_PAGINA_PADRAO = 1000;

  constructor(private http: HttpClient) {}

  /** Lista cobranças (filtro opcional por mês/ano de referência), página única grande */
  listar(mes?: number, ano?: number): Observable<CobrancaMensalResponseDTO[]> {
    let params = new HttpParams().set('size', CobrancaService.TAMANHO_PAGINA_PADRAO);
    if (mes != null) params = params.set('mes', mes);
    if (ano != null) params = params.set('ano', ano);
    return this.http.get<PaginaResponse<CobrancaMensalResponseDTO>>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.cobrancas}`,
      { params }
    ).pipe(map(pagina => pagina.conteudo));
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


