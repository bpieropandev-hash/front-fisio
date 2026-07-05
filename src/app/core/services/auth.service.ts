import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthenticationDTO, LoginResponseDTO } from '../interfaces/authentication.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  /** Folga para não aceitar token a segundos de expirar */
  private readonly EXPIRY_MARGIN_MS = 30_000;
  private readonly tokenSignal = signal<string | null>(this.getValidTokenFromStorage());

  isAuthenticated = computed(() => !!this.tokenSignal());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: AuthenticationDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}/login`,
      credentials
    ).pipe(
      tap(response => {
        this.setToken(response.token);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  /**
   * Token presente E não expirado (checa o claim exp do JWT).
   * Usado pelo guard: evita carregar telas com token vencido e chover 401.
   */
  isTokenValido(): boolean {
    const token = this.tokenSignal();
    if (!token) return false;
    const exp = this.extrairExpiracao(token);
    if (exp === null) return false;
    return exp * 1000 > Date.now() + this.EXPIRY_MARGIN_MS;
  }

  /** Limpa a sessão sem navegar (o chamador decide o redirect, ex.: guard com returnUrl) */
  limparSessao(): void {
    this.tokenSignal.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    this.tokenSignal.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getValidTokenFromStorage(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;
    const exp = this.extrairExpiracao(token);
    if (exp === null || exp * 1000 <= Date.now()) {
      localStorage.removeItem(this.TOKEN_KEY);
      return null;
    }
    return token;
  }

  /** Decodifica o payload do JWT (sem lib) e retorna exp em segundos, ou null se ilegível */
  private extrairExpiracao(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof decoded.exp === 'number' ? decoded.exp : null;
    } catch {
      return null;
    }
  }
}


