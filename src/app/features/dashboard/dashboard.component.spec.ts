import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { BreakpointService } from '../../core/services/breakpoint.service';

describe('Dashboard: erro distinto de lista vazia', () => {
 let component: DashboardComponent; let http: HttpTestingController;
 beforeEach(() => {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),MessageService,
   {provide:Router,useValue:{navigate:()=>{}}},
   {provide:BreakpointService,useValue:{isMobile:signal(true),isTablet:signal(true)}}]});
  http=TestBed.inject(HttpTestingController);
  component=TestBed.runInInjectionContext(()=>new DashboardComponent(TestBed.inject(DashboardService),TestBed.inject(Router),
   TestBed.inject(MessageService),TestBed.inject(AgendamentoService),TestBed.inject(PacienteService),TestBed.inject(ServicoService),TestBed.inject(UsuarioService)));
 });
 it('expõe erro de próximos atendimentos e permite nova tentativa com vazio válido', () => {
  component.carregarProximosAtendimentos();
  http.expectOne(r=>r.url.endsWith('/pacientes')).flush([]);
  http.expectOne(r=>r.url.endsWith('/servicos')).flush([]);
  http.expectOne(r=>r.url.endsWith('/agendamentos')).flush({}, {status:500,statusText:'Falha'});
  expect(component.erroProximos()).toBeTruthy();expect(component.carregandoProximos()).toBe(false);
  component.carregarProximosAtendimentos();expect(component.erroProximos()).toBe('');
  http.match(r=>r.method==='GET').forEach(req=>req.flush([]));
  expect(component.proximosAtendimentos()).toEqual([]);expect(component.erroProximos()).toBe('');http.verify();
 });
 it('expõe erro do resumo sem inventar totais de zero', () => {
  component.carregarDados();http.expectOne(r=>r.method==='GET').flush({}, {status:500,statusText:'Falha'});
  expect(component.erroCarga()).toBeTruthy();expect(component.resumo()).toBeNull();expect(component.carregando()).toBe(false);http.verify();
 });
});
