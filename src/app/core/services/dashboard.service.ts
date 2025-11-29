import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { DashboardResumoDTO } from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  buscarResumo(): Observable<DashboardResumoDTO> {
    return this.http.get<DashboardResumoDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dashboard}/resumo`
    );
  }
}


