import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { DashboardResumoDTO } from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  /** Resumo do dashboard. Sem parâmetros = mês atual; com inicio/fim (yyyy-MM-dd) = período. */
  buscarResumo(inicio?: string, fim?: string): Observable<DashboardResumoDTO> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fim) params = params.set('fim', fim);
    return this.http.get<DashboardResumoDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dashboard}/resumo`,
      { params }
    );
  }
}
