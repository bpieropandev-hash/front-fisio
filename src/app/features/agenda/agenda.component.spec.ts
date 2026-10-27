import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { EvolucaoFichaComponent } from '../../shared/components/evolucao-ficha/evolucao-ficha.component';
import { AgendaComponent } from './agenda.component';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { AtendimentoResponseDTO } from '../../core/interfaces/agendamento.interface';
const atendimento: AtendimentoResponseDTO = {id:1,pacienteId:1,servicoBaseId:1,dataHoraInicio:'2026-10-26T09:15:00',dataHoraFim:'2026-10-26T10:15:00',valorCobrado:80,pctClinicaSnapshot:20,pctProfissionalSnapshot:80,status:'AGENDADO',modalidadeCobranca:'AVULSO',statusPagamento:'PAYMENT_PENDING'};
describe('integração agenda e recebimento', () => {
 let component: AgendaComponent; let http: HttpTestingController;
 beforeEach(() => {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),MessageService,{provide:BreakpointService,useValue:{isMobile:signal(false),isTablet:signal(false)}}]});
  http=TestBed.inject(HttpTestingController);
  component=TestBed.runInInjectionContext(()=>new AgendaComponent(TestBed.inject(AgendamentoService),TestBed.inject(PacienteService),TestBed.inject(ServicoService),TestBed.inject(MessageService)));
  component.pacientes.set([{id:1,nome:'Ana',cpf:'123'}]); component.servicos.set([{id:1,nome:'Pilates',tipo:'PILATES',valorBase:80,pctClinica:20,pctProfissional:80,capacidade:15}]);
 });
 function abrir(atual:AtendimentoResponseDTO):void {
  component.abrirModalEdicao(atual);
  http.expectOne(r=>r.method==='GET' && r.url.endsWith(`/agendamentos/${atual.id}`)).flush(atual);
  component.estadoFichaMudou({dirty:false,carregando:false,salvando:false,conflito:false,carregado:true,versao:0,resumo:atual.evolucao || ''});
 }
 it('limpa erro de edição ao iniciar criação', () => {
  component.erroAtendimento.set('Falhou');component.carregandoAtendimento.set(true);
  component.abrirModalNovoAgendamento();
  expect(component.erroAtendimento()).toBe('');expect(component.carregandoAtendimento()).toBe(false);
 });
 it('preserva evolução existente ao copiar texto do lote', () => {
  component.itensLote.set([{id:1,dataHoraInicio:'',avulso:false,selecionado:true,evolucao:'Novo',recebedor:null,tipoPagamento:null},{id:2,dataHoraInicio:'',avulso:false,selecionado:true,evolucao:'Ficha salva',evolucaoPreservada:true,recebedor:null,tipoPagamento:null}]);
  component.copiarEvolucaoParaTodos();component.atualizarItemLote(2,'evolucao','Divergente');
  expect(component.itensLote()[1].evolucao).toBe('Ficha salva');
 });
 it('envia data de recebimento e resumo salvo sem alterar horário', () => {
  abrir(atendimento);component.statusEdit='CONCLUIDO';component.evolucaoSalva('Alongamento');component.recebedorEdit='CLINICA';component.tipoPagamentoEdit='PIX';component.dataPagamentoEdit=new Date(2026,9,25);
  component.salvarAtendimento();
  const req=http.expectOne(r=>r.method==='PUT'); expect(req.request.body).toEqual({status:'CONCLUIDO',recebedor:'CLINICA',tipoPagamento:'PIX',dataPagamento:'2026-10-25'});
  req.flush({...atendimento,status:'CONCLUIDO'});http.expectOne(r=>r.method==='GET').flush([]);http.verify();
 });
 it('impede confirmar recebimento sem data', () => {
  abrir(atendimento);component.statusEdit='CONCLUIDO';component.evolucaoEdit='Exercícios';component.recebedorEdit='CLINICA';component.tipoPagamentoEdit='PIX';component.salvarAtendimento();
  expect(component.modalVisivel).toBe(true);expect(component.salvando()).toBe(false);http.expectNone(r=>r.method==='PUT');http.verify();
 });
 it('exibe turma sem arraste e filtra os indivíduos antes do agrupamento', () => {
  component.carregarEventos();http.expectOne(r=>r.method==='GET').flush([atendimento,{...atendimento,id:2,pacienteId:2,status:'CONCLUIDO'}]);
  expect(component.eventosFiltrados()).toHaveLength(1);expect(component.eventosFiltrados()[0].editable).toBe(false);expect(component.eventosFiltrados()[0].end).toBe(atendimento.dataHoraFim);
  component.filtros.status=['CONCLUIDO'];component.aplicarFiltros();expect(component.eventosFiltrados()[0].id).toBe('2');http.verify();
 });
 it.each([
  {dirty:true,carregando:false,salvando:false,conflito:false,carregado:true},
  {dirty:false,carregando:false,salvando:true,conflito:false,carregado:true},
  {dirty:false,carregando:false,salvando:false,conflito:true,carregado:true},
  {dirty:false,carregando:true,salvando:false,conflito:false,carregado:false}
 ])('bloqueia atualização pai com ficha pendente: %o', estado => {
  abrir(atendimento);
  component.estadoFichaMudou({...estado,versao:1,resumo:'Resumo salvo'});
  component.statusEdit='CONCLUIDO';component.evolucaoEdit='Resumo salvo';component.salvarAtendimento();
  http.expectNone(r=>r.method==='PUT');expect(component.modalVisivel).toBe(true);http.verify();
 });
 it('mantém resumo salvo nos eventos ao fechar e reabrir a agenda', () => {
  component.carregarEventos();http.expectOne(r=>r.method==='GET').flush([{...atendimento,evolucao:'Antiga'}]);
  abrir({...atendimento,evolucao:'Antiga'});component.evolucaoSalva('Resumo novo');
  expect(component.eventos()[0].extendedProps?.['atendimento'].evolucao).toBe('Resumo novo');
  expect(component.eventosFiltrados()[0].extendedProps?.['atendimento'].evolucao).toBe('Resumo novo');
  http.verify();
 });
 it('busca a fonte atualizada ao reabrir em vez de reutilizar evolução antiga', () => {
  component.abrirModalEdicao({...atendimento,evolucao:'Antiga'});
  const req=http.expectOne(r=>r.method==='GET' && r.url.endsWith('/agendamentos/1'));
  req.flush({...atendimento,evolucao:'Resumo atual do servidor'});
  expect(component.evolucaoEdit).toBe('Resumo atual do servidor');http.verify();
 });
 it('não fecha silenciosamente enquanto a ficha tem alterações', () => {
  abrir(atendimento);
  component.estadoFichaMudou({dirty:true,carregando:false,salvando:false,conflito:false,carregado:true,versao:1,resumo:'Salvo'});
  component.fecharModal();expect(component.modalVisivel).toBe(true);expect(component.modalDescartarVisivel()).toBe(true);expect(component.atendimentoSelecionado()?.id).toBe(1);http.verify();
 });
 it('não envia texto legado para sobrescrever uma ficha estruturada salva', () => {
  abrir({...atendimento,evolucao:'Resumo da ficha'});
  component.estadoFichaMudou({dirty:false,carregando:false,salvando:false,conflito:false,carregado:true,versao:2,resumo:'Resumo da ficha'});
  component.statusEdit='CONCLUIDO';component.salvarAtendimento();
  const req=http.expectOne(r=>r.method==='PUT');expect(req.request.body).not.toHaveProperty('evolucao');
  req.flush({...atendimento,status:'CONCLUIDO'});http.expectOne(r=>r.method==='GET').flush([]);http.verify();
 });

 it('salvar a ficha preserva o complemento ainda não transferido', () => {
  abrir({...atendimento,evolucao:'Registro anterior'});
  Object.assign(component,{complementoEdit:'Complemento digitado'});
  component.evolucaoSalva('Resumo novo');
  expect((component as unknown as {complementoEdit:string}).complementoEdit).toBe('Complemento digitado');
  expect(component.evolucaoEdit).toBe('Registro anterior');http.verify();
 });

 it('leva só o complemento para Observações uma única vez e exige salvar a ficha', () => {
  abrir(atendimento);
  const ficha=TestBed.runInInjectionContext(()=>new EvolucaoFichaComponent());
  ficha.atendimentoId=1;
  ficha.estadoAlterado.subscribe(estado=>component.estadoFichaMudou(estado));
  ficha.ngOnChanges();
  http.expectOne(r=>r.url.endsWith('/evolucao-estruturada')).flush({versao:1,procedimentos:[],equipamentos:[],pressaoSistolica:null,pressaoDiastolica:null,dor:null,observacoes:'Existente',resumo:'Resumo salvo',autor:'Profissional',atualizadoEm:null});
  component.fichaComponent=ficha;component.complementoEdit='Novo complemento';
  component.levarComplementoParaFicha();component.levarComplementoParaFicha();
  expect(ficha.form.controls.observacoes.value).toBe('Existente\nNovo complemento');
  expect(component.complementoEdit).toBe('');expect(component.estadoFicha().dirty).toBe(true);
  component.salvarAtendimento();http.expectNone(r=>r.method==='PUT');ficha.ngOnDestroy();http.verify();
 });
 it('fecha somente após descarte explícito sem alterar o resumo persistido', () => {
  abrir({...atendimento,evolucao:'Salvo'});component.complementoEdit='Rascunho';component.fecharModal();
  expect(component.modalVisivel).toBe(true);component.descartarEFechar();expect(component.modalVisivel).toBe(false);http.expectNone(r=>r.method==='PUT');http.verify();
 });

 it('preserva complemento quando sua transferência excederia o limite de observações', () => {
  abrir(atendimento);
  const ficha=TestBed.runInInjectionContext(()=>new EvolucaoFichaComponent());
  ficha.form.controls.observacoes.setValue('a'.repeat(4990));
  component.fichaComponent=ficha;component.complementoEdit='Complemento maior que dez caracteres';
  component.levarComplementoParaFicha();
  expect(component.complementoEdit).toBe('Complemento maior que dez caracteres');
  expect(ficha.form.controls.observacoes.value).toHaveLength(4990);ficha.ngOnDestroy();http.verify();
 });

 it('preserva data e hora do slot ao abrir criação no calendário', () => {
  component.onDateClick({date:new Date(2026,9,27,10,0)});
  expect(component.dataNovoAgendamento).toEqual(new Date(2026,9,27));
  expect(component.horaNovoAgendamento).toBe('10:00');
  expect(component.novoAgendamento.dataHora).toEqual(new Date(2026,9,27,10));
 });
 it('arredonda meia-noite para o dia seguinte sem perder a data', () => {
  component.onDateClick({date:new Date(2026,9,27,23,50)});
  expect(component.novoAgendamento.dataHora).toEqual(new Date(2026,9,28,0));
 });
 it('resposta atrasada de outro paciente não sobrescreve o lote atual', () => {
  component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  const primeiro=http.expectOne(r=>r.params.get('pacienteId')==='1');
  component.pacienteLoteId=2;component.aoSelecionarPacienteLote();
  const segundo=http.expectOne(r=>r.params.get('pacienteId')==='2');
  segundo.flush([{...atendimento,id:202,pacienteId:2,dataHoraInicio:'2025-01-01T10:00:00'}]);
  primeiro.flush([{...atendimento,id:101,pacienteId:1,dataHoraInicio:'2025-01-01T10:00:00'}]);
  expect(component.itensLote().map(item=>item.id)).toEqual([202]);
  http.verify();
 });
 it('limpa lote anterior enquanto outro paciente carrega e impede envio', () => {
  component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  http.expectOne(r=>r.params.get('pacienteId')==='1').flush([{...atendimento,evolucao:'Exercício',dataHoraInicio:'2025-01-01T10:00:00'}]);
  component.pacienteLoteId=2;component.aoSelecionarPacienteLote();
  expect(component.itensLote()).toEqual([]);
  component.confirmarConclusaoLote();http.expectNone(r=>r.method==='POST');
  http.expectOne(r=>r.params.get('pacienteId')==='2').flush([]);http.verify();
 });
 it('ignora resposta após fechar o lote e não repõe sessões antigas', () => {
  component.abrirModalLote();component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  const req=http.expectOne(r=>r.params.get('pacienteId')==='1');
  component.fecharModalLote();
  req.flush([{...atendimento,dataHoraInicio:'2025-01-01T10:00:00'}]);
  expect(component.itensLote()).toEqual([]);expect(component.carregandoLote()).toBe(false);http.verify();
 });
 it('mantém nomes históricos de paciente e serviço inativos na agenda', () => {
  component.carregarDados();
  http.expectOne(r=>r.url.endsWith('/pacientes')).flush([{id:1,nome:'Ana histórica',cpf:'123',ativo:false}]);
  http.expectOne(r=>r.url.endsWith('/servicos')).flush([{id:1,nome:'Pilates histórico',tipo:'PILATES',ativo:false}]);
  http.expectOne(r=>r.url.endsWith('/agendamentos')).flush([{...atendimento,status:'CONCLUIDO'}]);
  expect(component.eventos()[0].extendedProps?.['pacienteNome']).toBe('Ana histórica');
  expect(component.eventos()[0].extendedProps?.['servicoNome']).toBe('Pilates histórico');http.verify();
 });

});
