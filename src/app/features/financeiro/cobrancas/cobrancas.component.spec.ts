import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { CobrancasComponent } from './cobrancas.component';

describe('Estorno e filtro de cobranças', () => {
 function setup() {
  TestBed.configureTestingModule({imports:[CobrancasComponent],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});
  const fixture = TestBed.createComponent(CobrancasComponent); const component = fixture.componentInstance;
  return {fixture,component,http:TestBed.inject(HttpTestingController)};
 }
 const paga: any = {id:1, assinaturaId:1, pacienteId:7, pacienteNome:'Ana', descricao:'Ana - Pilates',status:'PAGO',valor:100};
 it.each([true, false])('erro de consulta não aparece como vazio (tablet=%s)', tablet => {
  const {fixture,component,http} = setup();
  component.isTablet = signal(tablet); component.isMobile = signal(tablet);
  fixture.detectChanges();
  http.expectOne(r=>r.method==='GET').flush({}, {status:500,statusText:'Falha'});
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).not.toContain('Nenhuma cobrança encontrada');
  expect(fixture.nativeElement.querySelector('app-page-state [role="alert"]')).toBeTruthy();
 });
 it('filtra pelo identificador do paciente, sem confundir nomes iguais', () => {
  const {component} = setup();
  component.cobrancas.set([paga,{...paga,id:2,pacienteId:8}]);
  component.aoMudarFiltroPaciente(7);
  expect(component.cobrancasFiltradas().map(c=>c.id)).toEqual([1]);
 });
 it('ignora resposta antiga depois de trocar o mês', () => {
  const {component,http} = setup();
  component.carregarCobrancas();
  const antiga=http.expectOne(r=>r.method==='GET');
  component.aoMudarFiltroMesAno(new Date(2026,10,1));
  const atual=http.expectOne(r=>r.method==='GET');
  atual.flush({conteudo:[{...paga,id:2}]});
  antiga.flush({conteudo:[paga]});
  expect(component.cobrancas().map(c=>c.id)).toEqual([2]);
 });
 it('atualiza cobrança após estorno confirmado', () => {
  const {component,http} = setup();
  component.cobrancas.set([paga]); component.abrirModalEstorno(paga);
  component.motivoEstorno='Correção'; component.confirmarEstorno();
  http.expectOne(r=>r.method==='POST').flush({...paga,status:'PENDENTE',dataPagamento:null,recebedor:null,tipoPagamento:null});
  expect(component.cobrancas()[0].status).toBe('PENDENTE');
  expect(component.modalEstornoVisivel).toBe(false);
 });
 it('exige motivo e bloqueia envio duplo, preservando erro para tentar de novo', () => {
  const {component,http} = setup();
  component.abrirModalEstorno(paga);
  component.confirmarEstorno();
  http.expectNone(r=>r.method==='POST');
  component.motivoEstorno='Pagamento lançado por engano';
  component.confirmarEstorno(); component.confirmarEstorno();
  const req=http.expectOne(r=>r.method==='POST');
  expect(req.request.url).toContain('/1/estorno');
  expect(req.request.body).toEqual({motivo:'Pagamento lançado por engano'});
  req.flush({message:'Recibo emitido'},{status:400,statusText:'Erro'});
  expect(component.modalEstornoVisivel).toBe(true);
  expect(component.erroEstorno()).toBeTruthy();
  expect(component.estornando()).toBe(false);
 });
});
