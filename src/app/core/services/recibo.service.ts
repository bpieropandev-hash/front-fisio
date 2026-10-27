import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';
import { OrigemRecibo, ReciboCreateRequestDTO, ReciboResponseDTO } from '../interfaces/recibo.interface';
@Injectable({providedIn:'root'})
export class ReciboService {
 private readonly http = inject(HttpClient);
 private readonly url = `${API_CONFIG.baseUrl}/api/v1/recibos`;
 listar(origem: OrigemRecibo) {
  const params = new HttpParams().set(origem.atendimentoId != null ? 'atendimentoId' : 'cobrancaId', (origem.atendimentoId ?? origem.cobrancaId)!);
  return this.http.get<ReciboResponseDTO[]>(this.url, {params});
 }
 emitir(request: ReciboCreateRequestDTO) { return this.http.post<ReciboResponseDTO>(this.url, request); }
 baixarPdf(id:number) { return this.http.get(`${this.url}/${id}/pdf`, {responseType:'blob'}); }
}
