import { describe,it,expect,beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { RemarcacaoRecorrenteComponent } from './remarcacao-recorrente.component';
describe('remarcação explícita',()=>{
 let c:RemarcacaoRecorrenteComponent; let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}); c=TestBed.runInInjectionContext(()=>new RemarcacaoRecorrenteComponent());http=TestBed.inject(HttpTestingController);c.atendimento={id:1,pacienteId:1,servicoBaseId:2,dataHoraInicio:'2026-11-02T15:00:00',valorCobrado:80,pctClinicaSnapshot:20,pctProfissionalSnapshot:80,status:'AGENDADO'};c.ngOnInit();});
 it('não seleciona legados automaticamente',()=>{c.carregar();http.expectOne(r=>r.url.endsWith('/candidatos')).flush([{id:1,inicio:'2026-11-02T15:00:00',fim:'2026-11-02T16:00:00',protecao:null}]);expect(c.selecionados.size).toBe(0);});
 it('exige seleção explícita antes da prévia',()=>{c.gerarPrevia();expect(c.erro()).toContain('Selecione');http.expectNone(r=>r.method==='POST');});
 it('invalida prévia após alterar formulário',()=>{c.previa.set({operacaoId:'x'} as never);c.alterou();expect(c.previa()).toBeNull();});
 it('impede confirmação duplicada enquanto envia',()=>{c.previa.set({operacaoId:'x',conflitos:[],elegiveis:1} as never);c.confirmar();c.confirmar();const req=http.expectOne(r=>r.url.endsWith('/x/confirmar'));req.flush({origemIds:[1],destinoIds:[1],operacaoId:'x'});expect(c.resultado()).toBeTruthy();});
 it('erro de confirmação preserva formulário e exige nova prévia',()=>{c.motivo='Troca de horário';c.previa.set({operacaoId:'x',conflitos:[],elegiveis:1} as never);c.confirmar();http.expectOne(r=>r.method==='POST').flush({mensagem:'Agenda alterada. Gere nova prévia.'},{status:400,statusText:'Bad Request'});expect(c.previa()).toBeNull();expect(c.motivo).toBe('Troca de horário');expect(c.erro()).toContain('Agenda alterada');expect(c.enviando()).toBe(false);});
 it('ignora resposta de período anterior',()=>{c.carregar();const antiga=http.expectOne(r=>r.method==='GET');c.fim='2026-11-20';c.periodoMudou();c.carregar();const atual=http.expectOne(r=>r.method==='GET');atual.flush([{id:2,inicio:'2026-11-10T15:00:00',fim:'2026-11-10T16:00:00'}]);antiga.flush([{id:1}]);expect(c.candidatos()[0].id).toBe(2);});
 it('não confirma prévia com conflitos',()=>{c.previa.set({operacaoId:'x',conflitos:[{motivo:'Capacidade'}],elegiveis:1} as never);c.confirmar();http.expectNone(r=>r.method==='POST');});
 it('limpa seleção anterior durante recarga e impede prévia durante consulta',()=>{c.candidatos.set([{id:1} as never]);c.selecionados.add(1);c.carregar();expect(c.selecionados.size).toBe(0);expect(c.candidatos()).toHaveLength(0);c.selecionados.add(1);c.gerarPrevia();http.expectNone(r=>r.method==='POST');http.expectOne(r=>r.method==='GET').flush([]);});
 it('mostra validações junto aos campos obrigatórios',()=>{c.selecionados.add(1);c.horario='';c.motivo='';c.modo='SUBSTITUIR_DIAS';c.gerarPrevia();expect(c.camposErro()['horario']).toContain('horário');expect(c.camposErro()['motivo']).toContain('motivo');expect(c.camposErro()['dias']).toContain('dia');http.expectNone(r=>r.method==='POST');});
 it('marca vazio somente após consulta bem sucedida',()=>{expect(c.consultou()).toBe(false);c.carregar();http.expectOne(r=>r.method==='GET').flush([]);expect(c.consultou()).toBe(true);expect(c.candidatos()).toHaveLength(0);});
});
