import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { API_CONFIG } from '../config/api.config';

const TOKEN_KEY = 'auth_token';

/** Monta um JWT falso só com o payload que o AuthService lê (claim exp). */
function fakeJwt(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'usuario', exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `${header}.${payload}.assinatura-fake`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(TOKEN_KEY);
  });

  describe('isTokenValido', () => {
    it('retorna false quando não há token', () => {
      expect(service.isTokenValido()).toBe(false);
    });

    it('retorna true para token com exp no futuro', () => {
      const token = fakeJwt(3600);
      localStorage.setItem(TOKEN_KEY, token);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }]
      });
      service = TestBed.inject(AuthService);

      expect(service.isTokenValido()).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('retorna false para token expirado', () => {
      const token = fakeJwt(-3600);
      localStorage.setItem(TOKEN_KEY, token);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }]
      });
      service = TestBed.inject(AuthService);

      // Construtor já descarta token expirado do localStorage
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('retorna false quando falta a margem de expiração (expira em menos de 30s)', () => {
      const token = fakeJwt(10);
      localStorage.setItem(TOKEN_KEY, token);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }]
      });
      service = TestBed.inject(AuthService);

      expect(service.isTokenValido()).toBe(false);
    });
  });

  describe('login', () => {
    it('guarda o token retornado e autentica', () => {
      const token = fakeJwt(3600);

      service.login({ login: 'sbaldez', senha: 'teste12345' }).subscribe();

      const req = httpMock.expectOne(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ token });

      expect(service.getToken()).toBe(token);
      expect(service.isAuthenticated()).toBe(true);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
    });
  });

  describe('logout', () => {
    it('limpa o token, remove do localStorage e navega pra /login', () => {
      const token = fakeJwt(3600);
      localStorage.setItem(TOKEN_KEY, token);

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('renovarToken', () => {
    it('troca o token guardado pelo novo (sliding expiration)', () => {
      const tokenAntigo = fakeJwt(3600);
      const tokenNovo = fakeJwt(7200);
      localStorage.setItem(TOKEN_KEY, tokenAntigo);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }]
      });
      service = TestBed.inject(AuthService);

      service.renovarToken(tokenNovo);

      expect(service.getToken()).toBe(tokenNovo);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(tokenNovo);
    });
  });
});
