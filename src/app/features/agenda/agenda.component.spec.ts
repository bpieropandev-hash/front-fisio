import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
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
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),MessageService,{provide:BreakpointService,useValue:{isMobile:signal(false),isTablet:signal(false)}}]});
  http=TestBed.inject(HttpTestingController);
  component=TestBed.runInInjectionContext(()=>new AgendaComponent(TestBed.inject(AgendamentoService),TestBed.inject(PacienteService),TestBed.inject(ServicoService),TestBed.inject(MessageService)));
  component.pacientes.set([{id:1,nome:'Ana',cpf:'123'}]); component.servicos.set([{id:1,nome:'Pilates',tipo:'PILATES',valorBase:80,pctClinica:20,pctProfissional:80,capacidade:15}]);
 });
 function abrir(atual:AtendimentoResponseDTO):void {
  component.abrirModalEdicao(atual);
  http.expectOne(r=>r.method==='GET' && r.url.endsWith(`/agendamentos/${atual.id}`)).flush(atual);
  component.estadoFichaMudou({dirty:false,carregando:false,salvando:false,conflito:false,carregado:true,versao:0,resumo:atual.evolucao || ''});
 }
 it('mantém a linha do tempo ao recarregar e mostra loading, erro e recuperação', () => {
  const fixture = TestBed.createComponent(AgendaComponent);
  fixture.detectChanges();
  http.expectOne(r => r.url.endsWith('/pacientes')).flush([]);
  http.expectOne(r => r.url.endsWith('/servicos')).flush([]);
  http.expectOne(r => r.url.endsWith('/agendamentos')).flush([]);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-agenda-timeline')).not.toBeNull();
  expect(fixture.nativeElement.textContent).toContain('Nenhum atendimento neste dia');
  fixture.componentInstance.carregarEventos();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-agenda-timeline')).toBeNull();
  http.expectOne(r => r.url.endsWith('/agendamentos')).flush({}, {status:500,statusText:'Falha'});
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-agenda-timeline')).toBeNull();
  expect(fixture.componentInstance.erroAgenda()).toBeTruthy();
  fixture.componentInstance.carregarEventos();
  http.expectOne(r => r.url.endsWith('/agendamentos')).flush([]);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-agenda-timeline')).not.toBeNull();
  http.verify();
 });
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
 it('agrupa a turma em um horário e filtra os indivíduos antes do agrupamento', () => {
  component.carregarEventos();http.expectOne(r=>r.method==='GET').flush([atendimento,{...atendimento,id:2,pacienteId:2,status:'CONCLUIDO'}]);
  expect(component.eventosFiltrados()).toHaveLength(1);expect(component.eventosFiltrados()[0].extendedProps?.['participantes']).toHaveLength(2);expect(component.eventosFiltrados()[0].end).toBe(atendimento.dataHoraFim);
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

 it('fecha somente após descarte explícito sem alterar o resumo persistido', () => {
  abrir({...atendimento,evolucao:'Salvo'});component.estadoFichaMudou({dirty:true,carregando:false,salvando:false,conflito:false,carregado:true,versao:1,resumo:'Salvo'});component.fecharModal();
  expect(component.modalVisivel).toBe(true);component.descartarEFechar();expect(component.modalVisivel).toBe(false);http.expectNone(r=>r.method==='PUT');http.verify();
 });

 it('preserva dia e horário do slot ao abrir criação pela linha do tempo', () => {
  component.selecionarDiaAgenda(new Date(2026,9,27));
  component.criarNoHorario('10:00');
  expect(component.modalVisivel).toBe(true);
  expect(component.dataNovoAgendamento).toEqual(new Date(2026,9,27));
  expect(component.horaNovoAgendamento).toBe('10:00');
  expect(component.novoAgendamento.dataHora).toEqual(new Date(2026,9,27,10));
 });
 it('abre criação no dia selecionado sem horário quando vem do botão', () => {
  component.selecionarDiaAgenda(new Date(2026,9,27,15,40));
  component.abrirNovoAgendamentoDoDia();
  expect(component.dataNovoAgendamento).toEqual(new Date(2026,9,27));
  expect(component.horaNovoAgendamento).toBeNull();
  expect(component.novoAgendamento.dataHora).toBeNull();
 });
 it('resposta atrasada de outro paciente não sobrescreve o lote atual', () => {
  component.dataInicioLote=new Date(2025,0,1);component.dataFimLote=new Date(2025,0,31);component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  const primeiro=http.expectOne(r=>r.params.get('pacienteId')==='1');
  component.pacienteLoteId=2;component.aoSelecionarPacienteLote();
  const segundo=http.expectOne(r=>r.params.get('pacienteId')==='2');
  segundo.flush([{...atendimento,id:202,pacienteId:2,dataHoraInicio:'2025-01-01T10:00:00'}]);
  primeiro.flush([{...atendimento,id:101,pacienteId:1,dataHoraInicio:'2025-01-01T10:00:00'}]);
  expect(component.itensLote().map(item=>item.id)).toEqual([202]);
  http.verify();
 });
 it('limpa lote anterior enquanto outro paciente carrega e impede envio', () => {
  component.dataInicioLote=new Date(2025,0,1);component.dataFimLote=new Date(2025,0,31);component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  http.expectOne(r=>r.params.get('pacienteId')==='1').flush([{...atendimento,evolucao:'Exercício',dataHoraInicio:'2025-01-01T10:00:00'}]);
  component.pacienteLoteId=2;component.aoSelecionarPacienteLote();
  expect(component.itensLote()).toEqual([]);
  component.confirmarConclusaoLote();http.expectNone(r=>r.method==='POST');
  http.expectOne(r=>r.params.get('pacienteId')==='2').flush([]);http.verify();
 });
 it('ignora resposta após fechar o lote e não repõe sessões antigas', () => {
  component.abrirModalLote();component.dataInicioLote=new Date(2025,0,1);component.dataFimLote=new Date(2025,0,31);component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  const req=http.expectOne(r=>r.params.get('pacienteId')==='1');
  component.fecharModalLote();
  req.flush([{...atendimento,dataHoraInicio:'2025-01-01T10:00:00'}]);
  expect(component.itensLote()).toEqual([]);expect(component.carregandoLote()).toBe(false);http.verify();
 });
 it('consulta o lote no mês corrente e exclui respostas fora do período', () => {
  component.abrirModalLote();component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  const req=http.expectOne(r=>r.params.get('pacienteId')==='1');
  const hoje=new Date();const mes=String(hoje.getMonth()+1).padStart(2,'0');
  expect(req.request.params.get('dataInicio')).toBe(`${hoje.getFullYear()}-${mes}-01 00:00:00.000`);
  expect(req.request.params.get('dataFim')).toContain('23:59:59.999');
  req.flush([{...atendimento,dataHoraInicio:'2020-01-01T10:00:00'}]);
  expect(component.itensLote()).toEqual([]);http.verify();
 });
 it('impede consultar intervalo inválido e ignora consulta anterior após mudar período', () => {
  component.abrirModalLote();component.dataInicioLote=new Date(2025,0,1);component.dataFimLote=new Date(2025,0,31);component.pacienteLoteId=1;component.aoSelecionarPacienteLote();
  const req=http.expectOne(r=>r.params.get('pacienteId')==='1');
  component.dataInicioLote=new Date(2026,9,31);component.dataFimLote=new Date(2026,9,1);
  component.aoSelecionarPacienteLote();
  expect(component.erroPeriodoLote()).toContain('inicial');
  req.flush([{...atendimento,dataHoraInicio:'2026-10-02T10:00:00'}]);
  expect(component.itensLote()).toEqual([]);expect(component.carregandoLote()).toBe(false);
  http.expectNone(r=>r.method==='GET');http.verify();
 });
 it('mantém nomes históricos de paciente e serviço inativos na agenda', () => {
  component.carregarDados();
  http.expectOne(r=>r.url.endsWith('/pacientes')).flush([{id:1,nome:'Ana histórica',cpf:'123',ativo:false}]);
  http.expectOne(r=>r.url.endsWith('/servicos')).flush([{id:1,nome:'Pilates histórico',tipo:'PILATES',ativo:false}]);
  http.expectOne(r=>r.url.endsWith('/agendamentos')).flush([{...atendimento,status:'CONCLUIDO'}]);
  expect(component.eventos()[0].extendedProps?.['pacienteNome']).toBe('Ana histórica');
  expect(component.eventos()[0].extendedProps?.['servicoNome']).toBe('Pilates histórico');http.verify();
 });
 it('abre remarcação separada sem aplicar edição pontual ou perder rascunho da ficha', () => {
  abrir(atendimento);
  component.estadoFichaMudou({dirty:true,carregando:false,salvando:false,conflito:false,carregado:true,versao:1,resumo:'Salvo'});
  component.abrirRemarcacaoRecorrente();expect(component.atendimentoRemarcacao()).toBeNull();expect(component.modalVisivel).toBe(true);
  component.estadoFichaMudou({dirty:false,carregando:false,salvando:false,conflito:false,carregado:true,versao:1,resumo:'Salvo'});
  component.abrirRemarcacaoRecorrente();expect(component.atendimentoRemarcacao()?.id).toBe(1);expect(component.modalVisivel).toBe(false);
  http.expectNone(r=>r.method==='PUT'||r.method==='POST');http.verify();
 });


 describe('padrão A: dia, status e ações rápidas', () => {
  const noDia = (id:number, extra:Partial<AtendimentoResponseDTO> = {}) => ({...atendimento, id, pacienteId:id, dataHoraInicio:'2026-10-26T09:00:00', dataHoraFim:'2026-10-26T10:00:00', ...extra});
  beforeEach(() => component.selecionarDiaAgenda(new Date(2026,9,26)));
  function carregar(lista: AtendimentoResponseDTO[]) { component.carregarEventos(); http.expectOne(r=>r.method==='GET').flush(lista); }

  it('monta o horário com minutos de início/fim e usa 60 min quando o legado não tem fim', () => {
   carregar([noDia(1), noDia(2,{servicoBaseId:2,dataHoraInicio:'2026-10-26T14:30:00',dataHoraFim:undefined})]);
   const [a, b] = component.eventosDoDiaSelecionado();
   expect([a.inicioMin, a.fimMin]).toEqual([540, 600]);
   expect([b.inicioMin, b.fimMin]).toEqual([870, 930]);
   http.verify();
  });
  it('turma com status diferentes vira MISTO e mantém todos os participantes', () => {
   carregar([noDia(1), noDia(2,{status:'CONCLUIDO'})]);
   const [turma] = component.eventosDoDiaSelecionado();
   expect(turma.status).toBe('MISTO');
   expect(turma.participantes).toHaveLength(2);
   http.verify();
  });
  it('eventos de outros dias não aparecem na linha do tempo, mas marcam o navegador mensal', () => {
   carregar([noDia(1), noDia(2,{dataHoraInicio:'2026-10-27T09:00:00',dataHoraFim:'2026-10-27T10:00:00'})]);
   expect(component.eventosDoDiaSelecionado()).toHaveLength(1);
   expect(component.contagensPorDia()).toEqual({'2026-10-26':1,'2026-10-27':1});
   http.verify();
  });
  it('contagem de status do dia independe do filtro de status', () => {
   carregar([noDia(1), noDia(2,{servicoBaseId:2,status:'CONCLUIDO'})]);
   component.filtros.status=['CONCLUIDO'];component.aplicarFiltros();
   expect(component.contagemStatusDoDia()).toEqual({AGENDADO:1,CONCLUIDO:1,CANCELADO:0,FALTA:0});
   expect(component.eventosDoDiaSelecionado()).toHaveLength(1);
   http.verify();
  });
  it('alterna status sem nunca deixar todos desligados', () => {
   expect(component.statusAtivo('FALTA')).toBe(true);
   component.alternarStatus('FALTA');
   expect(component.filtros.status).toEqual(['AGENDADO','CONCLUIDO','CANCELADO']);
   expect(component.statusAtivo('FALTA')).toBe(false);
   component.alternarStatus('FALTA');
   expect(component.filtros.status).toEqual([]);
   component.filtros.status=['AGENDADO'];
   component.alternarStatus('AGENDADO');
   expect(component.filtros.status).toEqual(['AGENDADO']);
  });
  it('resumo do dia conta atendimentos, concluídos e o próximo horário', () => {
   component.agora.set(new Date(2026,9,26,8,0));
   component.pacientes.set([{id:1,nome:'Ana',cpf:'1'},{id:2,nome:'Bruno Lima',cpf:'2'}]);
   carregar([noDia(1,{status:'CONCLUIDO',dataHoraInicio:'2026-10-26T07:00:00',dataHoraFim:'2026-10-26T08:00:00'}), noDia(2,{servicoBaseId:2})]);
   expect(component.resumoDia()).toBe('2 atendimentos · 1 concluído · próximo às 09:00 (Bruno)');
   http.verify();
  });
  it('calcula quantos atendimentos a recorrência gera, com e sem dias marcados', () => {
   component.novoAgendamento.dataHora = new Date(2026,9,26,9);
   component.repetirAgendamento = true;
   component.dataFimRecorrencia = new Date(2026,10,23);
   expect(component.quantidadeRecorrencia()).toBe(5);
   component.diasSemanaSelecionados = [1,3];
   expect(component.quantidadeRecorrencia()).toBe(9);
   component.repetirAgendamento = false;
   expect(component.quantidadeRecorrencia()).toBe(0);
  });
  it('cancelar atendimento pede confirmação e só então envia o status', () => {
   abrir(atendimento);
   component.pedirStatusRapido('CANCELADO');
   expect(component.confirmacaoStatus()).toBe('CANCELADO');
   http.expectNone(r=>r.method==='PUT');
   component.confirmarStatusRapido();
   const req = http.expectOne(r=>r.method==='PUT' && r.url.endsWith('/agendamentos/1'));
   expect(req.request.body).toEqual({status:'CANCELADO'});
   req.flush({...atendimento,status:'CANCELADO'});
   http.expectOne(r=>r.method==='GET').flush([]);
   expect(component.confirmacaoStatus()).toBeNull();
   expect(component.modalVisivel).toBe(false);
   http.verify();
  });
  it('não abre a confirmação com ficha pendente', () => {
   abrir(atendimento);
   component.estadoFichaMudou({dirty:true,carregando:false,salvando:false,conflito:false,carregado:true,versao:1,resumo:'x'});
   component.pedirStatusRapido('FALTA');
   expect(component.confirmacaoStatus()).toBeNull();
   http.verify();
  });
 });
});
