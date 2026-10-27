import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReciboDialogComponent } from './recibo-dialog.component';
import { ReciboResponseDTO } from '../../../core/interfaces/recibo.interface';
const recibo = (id:number):ReciboResponseDTO => ({id,numero:`2026-${id}`,atendimentoId:id,cobrancaId:null,pacienteNome:'Ana',pacienteDocumento:'123',pagadorNome:'Ana',pagadorDocumento:'123',emitenteNome:'Clinica',emitenteDocumento:'456',descricao:'Atendimento',valor:80,dataPagamento:'2026-10-26',tipoPagamento:'PIX',emitidoEm:'2026-10-26T09:00:00'});
describe('recibo por origem', () => {
 let component:ReciboDialogComponent;let http:HttpTestingController;
 beforeEach(()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);component=TestBed.runInInjectionContext(()=>new ReciboDialogComponent());component.visible=true;component.origem={atendimentoId:1};component.dataPagamento='2026-10-26';component.pacienteNome='Ana';component.pacienteDocumento='123';
 });
 it('usa o snapshot existente ao reabrir, sem nova emissão',()=>{
  component.ngOnChanges();http.expectOne(r=>r.method==='GET').flush([recibo(1)]);
  expect(component.recibo()?.numero).toBe('2026-1');expect(component.recibo()?.pagadorNome).toBe('Ana');http.expectNone(r=>r.method==='POST');http.verify();
 });
 it('descarta resposta de emissão da origem anterior após trocar atendimento',()=>{
  component.ngOnChanges();http.expectOne(r=>r.method==='GET').flush([]);component.emitir();const antiga=http.expectOne(r=>r.method==='POST');
  component.origem={atendimentoId:2};component.ngOnChanges();http.expectOne(r=>r.method==='GET').flush([recibo(2)]);
  antiga.flush(recibo(1));expect(component.recibo()?.id).toBe(2);http.expectNone(r=>r.url.endsWith('/1/pdf'));http.verify();
 });
});
