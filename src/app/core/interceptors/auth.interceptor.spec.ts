import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../config/api.config';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { getToken: ReturnType<typeof vi.fn>; renovarToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      getToken: vi.fn().mockReturnValue(null),
      renovarToken: vi.fn(),
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('não adiciona Authorization quando não há token', () => {
    httpClient.get('/api/v1/pacientes').subscribe();

    const req = httpMock.expectOne('/api/v1/pacientes');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('adiciona Authorization: Bearer <token> quando há token', () => {
    authService.getToken.mockReturnValue('meu-token-jwt');

    httpClient.get('/api/v1/pacientes').subscribe();

    const req = httpMock.expectOne('/api/v1/pacientes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer meu-token-jwt');
    req.flush({});
  });

  it('troca o token guardado quando a resposta traz X-Renewed-Token', () => {
    authService.getToken.mockReturnValue('token-velho');

    httpClient.get('/api/v1/pacientes').subscribe();

    const req = httpMock.expectOne('/api/v1/pacientes');
    req.flush({}, { headers: { 'X-Renewed-Token': 'token-novo' } });

    expect(authService.renovarToken).toHaveBeenCalledWith('token-novo');
  });

  it('não chama renovarToken quando a resposta não traz X-Renewed-Token', () => {
    authService.getToken.mockReturnValue('token');

    httpClient.get('/api/v1/pacientes').subscribe();

    const req = httpMock.expectOne('/api/v1/pacientes');
    req.flush({});

    expect(authService.renovarToken).not.toHaveBeenCalled();
  });

  it('desloga em 401 fora do endpoint de login', () => {
    httpClient.get('/api/v1/pacientes').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/pacientes');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
  });

  it('não desloga em 401 no endpoint de login (evita loop)', () => {
    const loginUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}/login`;

    httpClient.post(loginUrl, {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne(loginUrl);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('não desloga em 403 (sem permissão, não sem sessão)', () => {
    httpClient.get('/api/v1/pacientes').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/pacientes');
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(authService.logout).not.toHaveBeenCalled();
  });
});
