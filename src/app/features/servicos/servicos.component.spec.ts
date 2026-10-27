import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ServicosComponent } from './servicos.component';
const original = {id:1,nome:'Pilates',tipo:'PILATES' as const,valorBase:180,pctClinica:20,pctProfissional:80,capacidade:15,ativo:true};
describe('Reajuste do catálogo e assinaturas',()=>{
 let component:ServicosComponent;let http:HttpTestingController;
 beforeEach(()=>{
  TestBed.configureTestingModule({imports:[ServicosComponent],providers:[provideHttpClient(),provideHttpClientTesting()]});
  component=TestBed.createComponent(ServicosComponent).componentInstance;http=TestBed.inject(HttpTestingController);
  component.editarServico(original);http.expectOne(r=>r.url.endsWith('/assinaturas-ativas/count')).flush(2);
  component.formServico.valorBase=190;component.formServico.nome='Pilates atualizado';component.salvarServico();
 });
 it('envia catálogo e propagação juntos sem sobrescrever o preço antigo primeiro',()=>{
  component.confirmarReajuste();
  http.expectNone(r=>r.method==='PUT');
  const req=http.expectOne(r=>r.method==='POST'&&r.url.endsWith('/reajuste'));
  expect(req.request.body).toMatchObject({novoValorBase:190,somenteAssinaturasNoValorAntigo:true,dadosServico:{nome:'Pilates atualizado',valorBase:190}});
  req.flush({assinaturasAtualizadas:1,cobrancasAtualizadas:0,assinaturasIgnoradasIds:[2]});
  http.expectOne(r=>r.method==='GET').flush([]);http.verify();
 });
 it('salvar apenas catálogo não propaga para assinaturas',()=>{
  component.reajusteOpcao='catalogo';component.confirmarReajuste();
  const req=http.expectOne(r=>r.method==='PUT');expect(req.request.body.valorBase).toBe(190);
  http.expectNone(r=>r.method==='POST');req.flush({...original,valorBase:190});
  http.expectOne(r=>r.method==='GET').flush([]);http.verify();
 });
 it('falha no reajuste mantém edição e permite repetir a mesma operação completa',()=>{
  component.confirmarReajuste();
  http.expectOne(r=>r.method==='POST').flush({}, {status:500,statusText:'Falha'});
  expect(component.modalVisivel).toBe(true);expect(component.formServico.valorBase).toBe(190);expect(component.salvando()).toBe(false);
  component.confirmarReajuste();http.expectOne(r=>r.method==='POST').flush({}, {status:500,statusText:'Falha'});http.verify();
 });
 it('não salva preço antes de conhecer o número de assinaturas ativas',()=>{
  component.reajusteDialogVisivel=false;component.editarServico({...original,id:2});
  component.formServico.valorBase=210;component.salvarServico();
  http.expectNone(r=>r.method==='PUT'||r.method==='POST');
  http.expectOne(r=>r.url.endsWith('/2/assinaturas-ativas/count')).flush(3);http.verify();
 });
 it('falha na contagem não transforma reajuste em edição silenciosa do catálogo',()=>{
  component.reajusteDialogVisivel=false;component.editarServico({...original,id:2});
  http.expectOne(r=>r.url.endsWith('/2/assinaturas-ativas/count')).flush({}, {status:500,statusText:'Falha'});
  component.formServico.valorBase=210;component.salvarServico();
  http.expectNone(r=>r.method==='PUT'||r.method==='POST');http.verify();
 });

});
