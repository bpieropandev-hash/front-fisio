import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, Observable, tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  UsuarioMeResponseDTO,
  AtualizarUsuarioRequestDTO,
  UploadFotoRequestDTO
} from '../interfaces/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.usuarios}`;
  private readonly usuarioSignal = signal<UsuarioMeResponseDTO | null>(null);
  readonly usuarioAtual = this.usuarioSignal.asReadonly();
  private sessao = 0;
  private requisicao = 0;
  private ultimaPublicada = 0;
  private ultimaMutacaoPublicada = 0;

  constructor(private http: HttpClient) {}

  buscarMe(): Observable<UsuarioMeResponseDTO> {
    return this.publicar(() => this.http.get<UsuarioMeResponseDTO>(`${this.baseUrl}/me`));
  }

  atualizarMe(dados: AtualizarUsuarioRequestDTO): Observable<UsuarioMeResponseDTO> {
    return this.publicar(() => this.http.put<UsuarioMeResponseDTO>(`${this.baseUrl}/me`, dados), true);
  }

  atualizarFoto(fotoBase64: string): Observable<UsuarioMeResponseDTO> {
    const body: UploadFotoRequestDTO = { fotoBase64 };
    return this.publicar(() => this.http.put<UsuarioMeResponseDTO>(`${this.baseUrl}/me/foto`, body), true);
  }

  limpar(): void {
    this.sessao++;
    this.usuarioSignal.set(null);
  }

  private publicar(request: () => Observable<UsuarioMeResponseDTO>, mutacao = false): Observable<UsuarioMeResponseDTO> {
    return defer(() => {
      const sessao = this.sessao;
      const requisicao = ++this.requisicao;
      const mutacaoNaConsulta = this.ultimaMutacaoPublicada;
      return request().pipe(tap(usuario => {
        // Mutações confirmadas prevalecem sobre snapshots GET, inclusive os iniciados durante o PUT.
        // Entre mutações, preservamos a ordem de início; uma sessão encerrada nunca publica novamente.
        const podePublicar = mutacao
          ? requisicao > this.ultimaMutacaoPublicada
          : requisicao > this.ultimaPublicada && mutacaoNaConsulta === this.ultimaMutacaoPublicada;
        if (sessao === this.sessao && podePublicar) {
          this.ultimaPublicada = Math.max(this.ultimaPublicada, requisicao);
          if (mutacao) this.ultimaMutacaoPublicada = requisicao;
          this.usuarioSignal.set(usuario);
        }
      }));
    });
  }
}
