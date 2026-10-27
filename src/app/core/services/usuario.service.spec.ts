import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from '../../app.component';
import { AuthService } from './auth.service';
import { UsuarioService } from './usuario.service';
import { ThemeService } from './theme.service';
import { AccentThemeService } from './accent-theme.service';
import { BreakpointService } from './breakpoint.service';
import { ConfiguracaoClinicaService } from './configuracao-clinica.service';
import { UsuarioMeResponseDTO } from '../interfaces/usuario.interface';

const original: UsuarioMeResponseDTO = {
  id: 1, login: 'ana', nome: 'Ana', email: null, telefone: null,
  fotoBase64: null, role: 'ADMIN', corPrimaria: null, fonteTema: null, tamanhoFonte: null
};

describe('Perfil compartilhado com o shell', () => {
  let http: HttpTestingController;
  let service: UsuarioService;
  let auth: AuthService;
  let shell: AppComponent;
  beforeEach(() => {
    localStorage.removeItem('auth_token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ThemeService, useValue: { toggleTheme: vi.fn() } },
        { provide: AccentThemeService, useValue: { aplicarCor: vi.fn(), aplicarFonte: vi.fn(), aplicarTamanhoFonte: vi.fn() } },
        { provide: BreakpointService, useValue: { isTablet: signal(false) } },
        { provide: ConfiguracaoClinicaService, useValue: { carregar: vi.fn(), limpar: vi.fn() } }]
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(UsuarioService);
    auth = TestBed.inject(AuthService);
    shell = TestBed.runInInjectionContext(() => new AppComponent(
      auth, TestBed.inject(ThemeService), TestBed.inject(BreakpointService),
      TestBed.inject(AccentThemeService), service, TestBed.inject((Router)),
      TestBed.inject(ConfiguracaoClinicaService), TestBed.inject(Location)
    ));
    auth.login({ login: 'ana', senha: 'secret' }).subscribe();
    http.expectOne(r => r.url.endsWith('/auth/login')).flush({ token: 'session-a' });
    TestBed.tick();
    http.expectOne(r => r.url.endsWith('/usuarios/me')).flush(original);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('auth_token'); });

  it('publica nome e foto no shell somente após confirmação HTTP e preserva após falha', () => {
    service.atualizarMe({ ...original, nome: 'Ana Maria' }).subscribe();
    expect(shell.usuarioAtual()?.nome).toBe('Ana');
    http.expectOne(r => r.method === 'PUT').flush({ ...original, nome: 'Ana Maria' });
    expect(shell.usuarioAtual()?.nome).toBe('Ana Maria');
    service.atualizarFoto('data:image/png;base64,new').subscribe();
    http.expectOne(r => r.url.endsWith('/me/foto')).flush({ ...original, nome: 'Ana Maria', fotoBase64: 'data:image/png;base64,new' });
    expect(shell.usuarioAtual()?.fotoBase64).toBe('data:image/png;base64,new');
    service.atualizarFoto('bad').subscribe({ error: () => {} });
    http.expectOne(r => r.url.endsWith('/me/foto')).flush({}, { status: 500, statusText: 'Falha' });
    expect(shell.usuarioAtual()?.fotoBase64).toBe('data:image/png;base64,new');
  });

  it('não deixa consulta antiga sobrescrever edição confirmada', () => {
    service.buscarMe().subscribe();
    const old = http.expectOne(r => r.method === 'GET');
    service.atualizarFoto('new').subscribe();
    http.expectOne(r => r.method === 'PUT').flush({ ...original, fotoBase64: 'new' });
    old.flush(original);
    expect(shell.usuarioAtual()?.fotoBase64).toBe('new');
  });

  it.each([true, false])('prioriza foto confirmada quando consulta começa durante upload (GET responde antes: %s)', consultaPrimeiro => {
    service.atualizarFoto('foto-confirmada').subscribe();
    const upload = http.expectOne(r => r.method === 'PUT');
    service.buscarMe().subscribe();
    const consulta = http.expectOne(r => r.method === 'GET');
    if (consultaPrimeiro) consulta.flush(original);
    upload.flush({ ...original, fotoBase64: 'foto-confirmada' });
    if (!consultaPrimeiro) consulta.flush(original);
    expect(shell.usuarioAtual()?.fotoBase64).toBe('foto-confirmada');
  });
  it.each(['logout', 'limparSessao'] as const)('limpa avatar em %s e ignora resposta da sessão anterior', method => {
    service.atualizarFoto('old-session').subscribe();
    const pending = http.expectOne(r => r.method === 'PUT');
    if (method === 'logout') vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth[method]();
    expect(shell.usuarioAtual()).toBeNull();
    pending.flush({ ...original, fotoBase64: 'old-session' });
    expect(shell.usuarioAtual()).toBeNull();
  });
});

