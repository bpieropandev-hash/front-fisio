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
  private readonly tokenSignal = signal<string | null>(this.getTokenFromStorage());

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

  private setToken(token: string): void {
    this.tokenSignal.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getTokenFromStorage(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  handle401Error(): void {
    this.logout();
  }

  handle403Error(): void {
    // Só desloga se realmente for um erro de autenticação
    // Erros 403 de autorização não devem deslogar
    this.logout();
  }
}


