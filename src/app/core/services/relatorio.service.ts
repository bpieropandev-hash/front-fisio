import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { RelatorioAcertoParams } from '../interfaces/relatorio.interface';

@Injectable({
  providedIn: 'root'
})
export class RelatorioService {
  constructor(private http: HttpClient) {}

  baixarRelatorioAcerto(params: RelatorioAcertoParams): Observable<Blob> {
    let httpParams = new HttpParams()
      .set('inicio', params.inicio)
      .set('fim', params.fim)
      .set('servicoIds', params.servicoIds.join(','));

    return this.http.get(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.relatorios}/acerto-financeiro`,
      {
        params: httpParams,
        responseType: 'blob'
      }
    );
  }

  baixarProntuario(pacienteId: number): Observable<Blob> {
    return this.http.get(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.relatorios}/prontuario/${pacienteId}`,
      {
        responseType: 'blob'
      }
    );
  }
}


