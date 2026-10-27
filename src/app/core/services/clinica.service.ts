import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { EvolucaoClinica, EvolucaoClinicaRequest, FotoClinica, FotoClinicaUpload } from '../interfaces/clinica.interface';

@Injectable({ providedIn: 'root' })
export class ClinicaService {
  private readonly http = inject(HttpClient);
  private evolucaoUrl(id: number): string { return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.agendamentos}/${id}/evolucao-estruturada`; }
  private fotosUrl(id: number): string { return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.pacientes}/${id}/fotos`; }

  buscarEvolucao(id: number): Observable<EvolucaoClinica> { return this.http.get<EvolucaoClinica>(this.evolucaoUrl(id)); }
  salvarEvolucao(id: number, dto: EvolucaoClinicaRequest): Observable<EvolucaoClinica> { return this.http.put<EvolucaoClinica>(this.evolucaoUrl(id), dto); }
  historicoEvolucao(id: number): Observable<EvolucaoClinica[]> { return this.http.get<EvolucaoClinica[]>(`${this.evolucaoUrl(id)}/historico`); }
  listarFotos(id: number): Observable<FotoClinica[]> { return this.http.get<FotoClinica[]>(this.fotosUrl(id)); }
  enviarFoto(id: number, dto: FotoClinicaUpload): Observable<FotoClinica> {
    const body = new FormData();
    body.append('imagem', dto.imagem);
    body.append('dataCaptura', dto.dataCaptura);
    body.append('regiao', dto.regiao);
    body.append('observacao', dto.observacao);
    return this.http.post<FotoClinica>(this.fotosUrl(id), body);
  }
  imagemFoto(id: number, fotoId: number): Observable<Blob> { return this.http.get(`${this.fotosUrl(id)}/${fotoId}/imagem`, { responseType: 'blob' }); }
  excluirFoto(id: number, fotoId: number): Observable<void> { return this.http.delete<void>(`${this.fotosUrl(id)}/${fotoId}`); }
}
