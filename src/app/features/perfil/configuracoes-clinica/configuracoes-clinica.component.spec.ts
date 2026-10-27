import {beforeEach,describe,it,expect} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {ConfiguracoesClinicaComponent} from './configuracoes-clinica.component';
import {configuracaoPadrao,ConfiguracaoClinicaService} from '../../../core/services/configuracao-clinica.service';
describe('Configurações da clínica',()=>{
 let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({imports:[ConfiguracoesClinicaComponent],providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
 it('não oferece salvar valores presumidos quando a consulta falha',()=>{
  const f=TestBed.createComponent(ConfiguracoesClinicaComponent);f.detectChanges();
  http.expectOne(r=>r.url.endsWith('/configuracoes')).flush({}, {status:500,statusText:'Falha'});
  http.expectOne(r=>r.url.endsWith('/servicos')).flush([]);f.detectChanges();
  expect(f.nativeElement.textContent).toContain('Não foi possível carregar');
  expect(f.nativeElement.querySelector('form')).toBeNull();f.componentInstance.salvar();http.expectNone(r=>r.method==='PUT');http.verify();
 });
 it('persiste catálogo personalizado e publica preferências somente após confirmação',()=>{
  const f=TestBed.createComponent(ConfiguracoesClinicaComponent);f.detectChanges();
  http.expectOne(r=>r.url.endsWith('/configuracoes')).flush(configuracaoPadrao());http.expectOne(r=>r.url.endsWith('/servicos')).flush([]);
  const c=f.componentInstance;c.novoEquipamento='Bola suíça';c.adicionar('equipamentos');c.dados()!.fotoLimiteMiB=2;c.salvar();
  const request=http.expectOne(r=>r.method==='PUT');expect(request.request.body.equipamentos.at(-1).nome).toBe('Bola suíça');
  expect(TestBed.inject(ConfiguracaoClinicaService).atual().fotoLimiteMiB).toBe(5);
  request.flush({...request.request.body,versao:1});expect(TestBed.inject(ConfiguracaoClinicaService).atual().fotoLimiteMiB).toBe(2);http.verify();
 });
 it('salva somente capacidade sem reenviar preço ou situação desatualizados',()=>{
  const f=TestBed.createComponent(ConfiguracoesClinicaComponent);f.detectChanges();http.expectOne(r=>r.url.endsWith('/configuracoes')).flush(configuracaoPadrao());http.expectOne(r=>r.url.endsWith('/servicos')).flush([]);
  f.componentInstance.salvarCapacidade({id:1,nome:'Pilates',tipo:'PILATES',valorBase:100,pctClinica:20,pctProfissional:80,capacidade:4,ativo:true});
  const req=http.expectOne(r=>r.url.endsWith('/servicos/1/capacidade'));expect(req.request.body).toEqual({capacidade:4});req.flush(null,{status:204,statusText:'No Content'});http.verify();
 });
 it('mantém edição após conflito de versão e informa como recuperar',()=>{
  const f=TestBed.createComponent(ConfiguracoesClinicaComponent);f.detectChanges();http.expectOne(r=>r.url.endsWith('/configuracoes')).flush(configuracaoPadrao());http.expectOne(r=>r.url.endsWith('/servicos')).flush([]);
  f.componentInstance.dados()!.emitenteNome='Fisioterapeuta';f.componentInstance.salvar();http.expectOne(r=>r.method==='PUT').flush({}, {status:409,statusText:'Conflito'});
  expect(f.componentInstance.dados()!.emitenteNome).toBe('Fisioterapeuta');expect(f.componentInstance.erro()).toContain('outra sessão');http.verify();
 });
});
