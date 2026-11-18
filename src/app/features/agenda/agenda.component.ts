import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { RemarcacaoRecorrenteComponent } from './remarcacao-recorrente.component';
import { untracked } from '@angular/core';
import { ConfiguracaoClinicaService } from '../../core/services/configuracao-clinica.service';
import { Component, DestroyRef, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DateFieldComponent } from '../../shared/components/date-field/date-field.component';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelect } from 'primeng/multiselect';
import { Checkbox } from 'primeng/checkbox';
import { Toast } from 'primeng/toast';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { AtendimentoResponseDTO, AgendamentoRequestDTO, ConcluirAtendimentoLoteItemDTO } from '../../core/interfaces/agendamento.interface';
import { PacienteResponseDTO } from '../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../core/interfaces/servico.interface';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { AgendaTimelineComponent } from './agenda-timeline/agenda-timeline.component';
import { AgendaMiniMesComponent, chaveDia } from './agenda-mini-mes/agenda-mini-mes.component';
import { DURACAO_PADRAO_MIN, EventoDoDiaUI, minutosDoDia } from './agenda-timeline.util';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { formatDateTimeForApi, formatDateTimeForApiBody, formatDateForApi } from '../../core/utils/date-format.util';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';
import {
  obterTipoServico,
  obterLabelStatus,
  formatHora,
  obterSiglaTipoServico,
  combinarDataHora,
  separarDataHora,
  montarHorariosComExtra
} from './agenda-event.util';
import { EvolucaoFichaComponent, EvolucaoFichaEstado } from '../../shared/components/evolucao-ficha/evolucao-ficha.component';
import { ReciboDialogComponent } from '../../shared/components/recibo-dialog/recibo-dialog.component';
import { OrigemRecibo } from '../../core/interfaces/recibo.interface';
import { agruparAtendimentos, ehMensalidade, podeEmitirReciboAtendimento } from './agenda-group.util';
import { obterPillStatus } from '../../core/utils/status-pill.util';

const DIAS_SEMANA_CURTO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** Atendimento (ou turma) pronto para a agenda. Formato próprio, independente de biblioteca de calendário. */
export interface AgendaEvento {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps?: Record<string, any>;
}

interface ItemLoteUI {
  id: number;
  dataHoraInicio: string;
  avulso: boolean;
  selecionado: boolean;
  evolucao: string;
  evolucaoPreservada?: boolean;
  recebedor: 'CLINICA' | 'PROFISSIONAL' | null;
  tipoPagamento: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | null;
}

@Component({
  selector: 'app-agenda',
  imports: [PageStateComponent, RemarcacaoRecorrenteComponent,
    CommonModule,
    FormsModule,
    AgendaTimelineComponent,
    AgendaMiniMesComponent,
    Menu,
    Dialog,
    Button,
    Textarea,
    Select,
    DateFieldComponent,
    ToggleSwitchModule,
    MultiSelect,
    Checkbox,
    Toast, EvolucaoFichaComponent, ReciboDialogComponent
  ],
  providers: [MessageService],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss']
})
export class AgendaComponent implements OnInit {
  atendimentoRemarcacao = signal<(AtendimentoResponseDTO & { pacienteNome?: string; servicoNome?: string }) | null>(null);

  abrirRemarcacaoRecorrente(): void {
    const atendimento = this.atendimentoSelecionado();
    if (!atendimento || this.salvando()) return;
    if (this.motivoBloqueioFicha() || this.temAlteracoesPendentes()) {
      this.avisarFichaPendente();
      return;
    }
    this.descartarEFechar();
    this.atendimentoRemarcacao.set(atendimento);
  }

  remarcacaoConcluida(): void { this.carregarEventos(); }
  carregandoAgenda = signal(false);
  erroAgenda = signal('');
  erroCatalogoAgenda = signal('');
  private consultaAgenda = 0;
  readonly configuracoes = inject(ConfiguracaoClinicaService);
  private readonly atualizarAgrupamento = effect(() => { this.configuracoes.atual(); untracked(() => this.aplicarFiltros()); });
  private readonly breakpointService = inject(BreakpointService);
  isMobile = this.breakpointService.isMobile;
  isTablet = this.breakpointService.isTablet;
  pacientesAtivos = computed(() => this.pacientes().filter(p => p.ativo !== false));
  servicosAtivos = computed(() => this.servicos().filter(s => s.ativo !== false));
  obterPillStatus = obterPillStatus;


  // --- Dia exibido: linha do tempo (padrão A), tira de semana no celular e navegador mensal no desktop ---
  diaSelecionadoAgenda = signal<Date>(this.iniciarDoDia(new Date()));

  semanaAgendaAtual = computed(() => {
    const base = this.diaSelecionadoAgenda();
    const inicioSemana = new Date(base);
    inicioSemana.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      return dia;
    });
  });

  eventosDoDiaSelecionado = computed<EventoDoDiaUI[]>(() => {
    const dia = this.diaSelecionadoAgenda();
    return this.eventosFiltrados()
      .filter(evento => this.mesmoDia(new Date(evento.start), dia))
      .map(evento => {
        const participantes = evento.extendedProps?.['participantes'] as AtendimentoResponseDTO[];
        const atendimento = participantes[0];
        const inicio = new Date(evento.start);
        const inicioMin = minutosDoDia(inicio);
        const fimMin = evento.end ? Math.max(minutosDoDia(new Date(evento.end)), inicioMin + 15) : inicioMin + DURACAO_PADRAO_MIN;
        const status = new Set(participantes.map(p => p.status)).size === 1 ? atendimento.status : 'MISTO';
        return {
          atendimento, participantes, chave: String(evento.id),
          hora: formatHora(inicio),
          pacienteNome: (evento.extendedProps?.['pacienteNome'] as string) || '',
          servicoNome: (evento.extendedProps?.['servicoNome'] as string) || '',
          inicioMin, fimMin, status,
          sigla: obterSiglaTipoServico((evento.extendedProps?.['servicoTipo'] as string) || '')
        };
      })
      .sort((a, b) => a.inicioMin - b.inicioMin);
  });

  /** Horários por dia (yyyy-MM-dd) para as marcas de ocupação do navegador mensal. */
  contagensPorDia = computed<Record<string, number>>(() => {
    const contagens: Record<string, number> = {};
    for (const evento of this.eventosFiltrados()) {
      const chave = chaveDia(new Date(evento.start));
      contagens[chave] = (contagens[chave] ?? 0) + 1;
    }
    return contagens;
  });

  /** Atendimentos individuais do dia por status (chips de filtro); não depende do filtro de status. */
  contagemStatusDoDia = computed<Record<string, number>>(() => {
    const dia = this.diaSelecionadoAgenda();
    const contagem: Record<string, number> = { AGENDADO: 0, CONCLUIDO: 0, CANCELADO: 0, FALTA: 0 };
    for (const evento of this.eventos()) {
      const atendimento = evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO | undefined;
      if (atendimento && this.mesmoDia(new Date(evento.start), dia)) contagem[atendimento.status] = (contagem[atendimento.status] ?? 0) + 1;
    }
    return contagem;
  });

  mesReferencia = signal<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  /** Relógio da linha do "agora"; atualizado a cada minuto. */
  agora = signal(new Date());
  readonly alturaHora = computed(() => (this.isTablet() ? 64 : 72));
  readonly statusChips = [
    { valor: 'AGENDADO', rotulo: 'Agendado' },
    { valor: 'CONCLUIDO', rotulo: 'Concluído' },
    { valor: 'CANCELADO', rotulo: 'Cancelado' },
    { valor: 'FALTA', rotulo: 'Falta' }
  ];
  private readonly destroyRef = inject(DestroyRef);
  readonly menuAcoes = signal<MenuItem[]>([]);

  tituloDia = computed(() => {
    const dia = this.diaSelecionadoAgenda();
    const rotulo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dia);
    return (this.ehHoje(dia) ? 'Hoje · ' : '') + rotulo;
  });

  /** "7 atendimentos · 3 concluídos · próximo às 15:30 (Fernanda)". */
  resumoDia = computed(() => {
    const eventos = this.eventosDoDiaSelecionado();
    const atendimentos = eventos.flatMap(e => e.participantes);
    if (atendimentos.length === 0) return 'Nenhum atendimento neste dia';
    const concluidos = atendimentos.filter(a => a.status === 'CONCLUIDO').length;
    const minAgora = minutosDoDia(this.agora());
    const alvo = eventos.filter(e => e.participantes.some(p => p.status === 'AGENDADO'))
      .find(e => !this.ehHoje(this.diaSelecionadoAgenda()) || e.inicioMin >= minAgora);
    const proximo = alvo ? ` · próximo às ${alvo.hora} (${alvo.participantes.length > 1 ? alvo.servicoNome : alvo.pacienteNome.split(' ')[0]})` : '';
    return `${atendimentos.length} atendimento${atendimentos.length === 1 ? '' : 's'} · ${concluidos} concluído${concluidos === 1 ? '' : 's'}${proximo}`;
  });

  statusAtivo(status: string): boolean {
    return this.filtros.status.length === 0 || this.filtros.status.includes(status);
  }

  /** Liga/desliga um status. Sem filtro = todos ligados; nunca deixa todos desligados. */
  alternarStatus(status: string): void {
    const todos = this.statusChips.map(c => c.valor);
    const atuais = this.filtros.status.length === 0 ? todos : this.filtros.status;
    const proximos = atuais.includes(status) ? atuais.filter(s => s !== status) : [...atuais, status];
    if (proximos.length === 0) return;
    this.filtros.status = proximos.length === todos.length ? [] : proximos;
    this.aplicarFiltros();
  }

  mudarMes(delta: number): void {
    const m = this.mesReferencia();
    this.mesReferencia.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  irParaHoje(): void {
    this.selecionarDiaAgenda(new Date());
  }

  navegarDia(delta: number): void {
    const d = new Date(this.diaSelecionadoAgenda());
    d.setDate(d.getDate() + delta);
    this.selecionarDiaAgenda(d);
  }

  private iniciarDoDia(data: Date): Date {
    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private mesmoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  rotuloDiaSemana(data: Date): string {
    return DIAS_SEMANA_CURTO[data.getDay()];
  }

  ehHoje(data: Date): boolean {
    return this.mesmoDia(data, new Date());
  }

  ehDiaSelecionadoAgenda(data: Date): boolean {
    return this.mesmoDia(data, this.diaSelecionadoAgenda());
  }

  rotuloDiaSelecionadoAgenda(): string {
    const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(this.diaSelecionadoAgenda());
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  selecionarDiaAgenda(data: Date): void {
    const dia = this.iniciarDoDia(data);
    this.diaSelecionadoAgenda.set(dia);
    this.mesReferencia.set(new Date(dia.getFullYear(), dia.getMonth(), 1));
  }

  semanaAgendaAnterior(): void {
    const d = new Date(this.diaSelecionadoAgenda());
    d.setDate(d.getDate() - 7);
    this.diaSelecionadoAgenda.set(d);
  }

  semanaAgendaProxima(): void {
    const d = new Date(this.diaSelecionadoAgenda());
    d.setDate(d.getDate() + 7);
    this.diaSelecionadoAgenda.set(d);
  }

  abrirNovoAgendamentoDoDia(hora?: string): void {
    if (!this.abrirModalNovoAgendamento()) return;
    // abrirModalNovoAgendamento() zera data e hora — reaplica o dia selecionado (e o horário clicado, se houver)
    this.dataNovoAgendamento = new Date(this.diaSelecionadoAgenda());
    if (hora) this.horaNovoAgendamento = hora;
    this.atualizarDataHoraNovoAgendamento();
  }

  modalVisivel = false;
  atendimentoSelecionado = signal<AtendimentoResponseDTO & { pacienteNome?: string; servicoNome?: string } | null>(null);
  salvando = signal(false);
  pacientes = signal<PacienteResponseDTO[]>([]);
  servicos = signal<ServicoResponseDTO[]>([]);
  eventos = signal<AgendaEvento[]>([]);
  eventosFiltrados = signal<AgendaEvento[]>([]);
  filtrosVisiveis = signal(false);

  filtros = {
    status: [] as string[],
    pacienteId: null as number | null,
    servicoId: null as number | null,
    dataInicio: null as Date | null,
    dataFim: null as Date | null
  };

  dataHoraEdit: Date | null = null;
  dataEdit: Date | null = null;
  horaEdit: string | null = null;
  /** Data/hora original do atendimento em edição — só enviamos ao backend se o usuário alterar */
  private dataHoraOriginal: Date | null = null;
  /** Opções de horário do modal de edição: grade de 30min + o horário exato do atendimento */
  horariosEdicao: { label: string; value: string }[] = [];

  dataNovoAgendamento: Date | null = null;
  horaNovoAgendamento: string | null = null;

  turmaSelecionada = signal<AtendimentoResponseDTO[]>([]);
  modalTurmaVisivel = false;
  reciboVisivel = false;
  reciboOrigem: OrigemRecibo | null = null;
  dataPagamentoEdit: Date | null = null;
  readonly carregandoAtendimento = signal(false);
  readonly erroAtendimento = signal('');
  readonly estadoFicha = signal<EvolucaoFichaEstado>({dirty:false,carregando:true,salvando:false,conflito:false,carregado:false,versao:0,resumo:''});
  readonly modalDescartarVisivel = signal(false);
  resumoFichaSalvo = '';
  private aberturaAtendimento = 0;
  private temFichaEstruturada = false;
  private evolucaoOriginal = '';

  estadoFichaMudou(estado: EvolucaoFichaEstado): void {
    const anterior = this.estadoFicha();
    this.estadoFicha.set(estado);
    if (estado.carregado && (!anterior.carregado || anterior.versao !== estado.versao)) {
      this.resumoFichaSalvo = estado.resumo;
      this.temFichaEstruturada = estado.versao > 0;
      if (estado.versao > 0) this.atualizarResumoNaAgenda(estado.resumo);
    }
  }

  motivoBloqueioFicha(): string {
    const estado = this.estadoFicha();
    if (this.carregandoAtendimento() || estado.carregando) return 'Aguarde carregar a evolução antes de salvar o atendimento.';
    if (estado.salvando) return 'Aguarde o salvamento da ficha antes de salvar ou concluir o atendimento.';
    if (estado.conflito) return 'Resolva o conflito e salve a ficha antes de salvar ou concluir o atendimento.';
    if (!estado.carregado) return 'Carregue a ficha com sucesso antes de salvar ou concluir o atendimento.';
    if (estado.dirty) return 'Salve a evolução da ficha antes de salvar ou concluir o atendimento.';
    return '';
  }

  private atualizarResumoNaAgenda(resumo: string): void {
    const id = this.atendimentoSelecionado()?.id;
    if (!id) return;
    this.atendimentoSelecionado.update(a => a ? {...a, evolucao: resumo} : a);
    this.eventos.update(eventos => eventos.map(evento => {
      const atendimento = evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO | undefined;
      return atendimento?.id === id ? {...evento, extendedProps: {...evento.extendedProps, atendimento: {...atendimento, evolucao: resumo}}} : evento;
    }));
    this.aplicarFiltros();
  }
  ehMensalidade = ehMensalidade;
  podeEmitirRecibo = podeEmitirReciboAtendimento;

  nomePaciente(atendimento: AtendimentoResponseDTO): string { return this.pacientes().find(p => p.id === atendimento.pacienteId)?.nome ?? `Paciente #${atendimento.pacienteId}`; }
  abrirRecibo(): void { const atendimento = this.atendimentoSelecionado(); if (!atendimento || !this.podeEmitirRecibo(atendimento)) return; this.reciboOrigem = { atendimentoId: atendimento.id }; this.reciboVisivel = true; }
  evolucaoSalva(resumo: string): void {
    this.resumoFichaSalvo = resumo;
    this.temFichaEstruturada = true;
    this.atualizarResumoNaAgenda(resumo);
  }

  statusEdit: string = 'AGENDADO';
  evolucaoEdit: string = '';
  recebedorEdit: 'CLINICA' | 'PROFISSIONAL' | null = null;
  tipoPagamentoEdit: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | null = null;

  novoAgendamento = {
    pacienteIds: [] as number[],
    servicoId: null as number | null,
    dataHora: null as Date | null
  };

  repetirAgendamento = false;
  dataFimRecorrencia: Date | null = null;
  diasSemanaSelecionados: number[] = [];

  // Gera lista de horários de 30 em 30 minutos (00:00 até 23:30)
  horariosDisponiveis = Array.from({ length: 48 }, (_, i) => {
    const horas = Math.floor(i / 2);
    const minutos = (i % 2) * 30;
    const horaFormatada = String(horas).padStart(2, '0');
    const minutoFormatado = String(minutos).padStart(2, '0');
    return {
      label: `${horaFormatada}:${minutoFormatado}`,
      value: `${horaFormatada}:${minutoFormatado}`
    };
  });

  diasSemanaOptions = [
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 },
    { label: 'Dom', value: 7 }
  ];

  statusOptions = [
    { label: 'Agendado', value: 'AGENDADO' },
    { label: 'Concluído', value: 'CONCLUIDO' },
    { label: 'Cancelado', value: 'CANCELADO' },
    { label: 'Falta', value: 'FALTA' }
  ];

  recebedorOptions = [
    { label: 'Clínica', value: 'CLINICA' },
    { label: 'Profissional', value: 'PROFISSIONAL' }
  ];

  /** Somente cobertura explícita identifica mensalidade. */
  ehAtendimentoAvulso(atendimento: Partial<AtendimentoResponseDTO> | null | undefined): boolean {
    return !ehMensalidade(atendimento) && Number(atendimento?.valorCobrado ?? 0) > 0;
  }

  tipoPagamentoOptions = [
    { label: 'Dinheiro', value: 'DINHEIRO' },
    { label: 'Cartão de Crédito', value: 'CARTAO_CREDITO' },
    { label: 'Cartão de Débito', value: 'CARTAO_DEBITO' },
    { label: 'PIX', value: 'PIX' }
  ];

  // --- Fechamento em lote (spec 07 F1) ---
  modalLoteVisivel = false;
  pacienteLoteId: number | null = null;
  dataInicioLote: Date | null = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  dataFimLote: Date | null = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  erroPeriodoLote = signal('');
  erroLote = signal('');
  carregandoLote = signal(false);
  salvandoLote = signal(false);
  itensLote = signal<ItemLoteUI[]>([]);
  private requisicaoLote = 0;
  private pacienteLoteCarregado: number | null = null;
  private periodoLoteCarregado = '';

  private chavePeriodoLote(): string {
    return this.dataInicioLote && this.dataFimLote
      ? `${formatDateForApi(this.dataInicioLote)}/${formatDateForApi(this.dataFimLote)}` : '';
  }

  abrirModalLote(): void {
    if (this.salvandoLote()) return;
    ++this.requisicaoLote;
    this.pacienteLoteCarregado = null;
    this.carregandoLote.set(false);
    this.pacienteLoteId = null;
    const hoje = new Date();
    this.dataInicioLote = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    this.dataFimLote = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    this.erroPeriodoLote.set('');
    this.erroLote.set('');
    this.itensLote.set([]);
    this.modalLoteVisivel = true;
  }

  fecharModalLote(): void {
    if (this.salvandoLote()) return;
    ++this.requisicaoLote;
    this.pacienteLoteCarregado = null;
    this.itensLote.set([]);
    this.carregandoLote.set(false);
    this.modalLoteVisivel = false;
  }

  aoSelecionarPacienteLote(): void {
    if (this.salvandoLote()) return;
    const requisicao = ++this.requisicaoLote;
    const pacienteId = this.pacienteLoteId;
    this.pacienteLoteCarregado = null;
    this.itensLote.set([]);
    this.carregandoLote.set(false);
    this.erroPeriodoLote.set('');
    this.erroLote.set('');
    this.periodoLoteCarregado = '';
    if (!this.dataInicioLote || !this.dataFimLote ||
        !Number.isFinite(this.dataInicioLote.getTime()) || !Number.isFinite(this.dataFimLote.getTime())) {
      this.erroPeriodoLote.set('Informe a data inicial e a data final.');
      return;
    }
    if (this.dataInicioLote > this.dataFimLote) {
      this.erroPeriodoLote.set('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    if (!pacienteId) return;

    const inicio = this.iniciarDoDia(this.dataInicioLote);
    const fim = new Date(this.dataFimLote);
    fim.setHours(23, 59, 59, 999);
    const periodo = this.chavePeriodoLote();
    this.carregandoLote.set(true);
    this.agendamentoService.listar({ pacienteId, dataInicio: formatDateTimeForApi(inicio), dataFim: formatDateTimeForApi(fim, true) }).subscribe({
      next: (atendimentos) => {
        if (requisicao !== this.requisicaoLote || pacienteId !== this.pacienteLoteId || periodo !== this.chavePeriodoLote()) return;
        const agora = new Date();
        const itens: ItemLoteUI[] = atendimentos
          .filter(a => {
            const data = new Date(a.dataHoraInicio);
            return a.pacienteId === pacienteId && a.status === 'AGENDADO' && data < agora && data >= inicio && data <= fim;
          })
          .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
          .map(a => ({
            id: a.id,
            dataHoraInicio: a.dataHoraInicio,
            avulso: this.ehAtendimentoAvulso(a),
            selecionado: true,
            evolucao: a.evolucao || '',
            evolucaoPreservada: !!a.evolucao?.trim(),
            recebedor: null,
            tipoPagamento: null
          }));
        this.pacienteLoteCarregado = pacienteId;
        this.periodoLoteCarregado = periodo;
        this.itensLote.set(itens);
        this.carregandoLote.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (requisicao !== this.requisicaoLote || pacienteId !== this.pacienteLoteId || periodo !== this.chavePeriodoLote()) return;
        this.carregandoLote.set(false);
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.erroLote.set(msg.detail);
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
      }
    });
  }

  copiarEvolucaoParaTodos(): void {
    const itens = this.itensLote();
    if (itens.length === 0) return;
    const primeiraEvolucao = itens[0].evolucao;
    this.itensLote.set(itens.map(i => i.evolucaoPreservada ? i : ({ ...i, evolucao: primeiraEvolucao })));
  }

  atualizarItemLote(id: number, campo: 'evolucao' | 'recebedor' | 'tipoPagamento' | 'selecionado', valor: any): void {
    this.itensLote.set(this.itensLote().map(i => i.id === id && !(campo === 'evolucao' && i.evolucaoPreservada) ? { ...i, [campo]: valor } : i));
  }

  confirmarConclusaoLote(): void {
    if (this.carregandoLote() || this.salvandoLote() || !this.pacienteLoteId || this.pacienteLoteId !== this.pacienteLoteCarregado || this.periodoLoteCarregado !== this.chavePeriodoLote()) return;
    const selecionados = this.itensLote().filter(i => i.selecionado);
    if (selecionados.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione ao menos um atendimento' });
      return;
    }

    const semEvolucao = selecionados.some(i => !i.evolucao || !i.evolucao.trim());
    if (semEvolucao) {
      this.messageService.add({ severity: 'warn', summary: 'Atenção', detail: 'Evolução é obrigatória para todos os atendimentos selecionados' });
      return;
    }

    this.salvandoLote.set(true);
    const itens: ConcluirAtendimentoLoteItemDTO[] = selecionados.map(i => ({
      id: i.id,
      evolucao: i.evolucao,
      recebedor: i.avulso && i.recebedor ? i.recebedor : undefined,
      tipoPagamento: i.avulso && i.tipoPagamento ? i.tipoPagamento : undefined,
      dataPagamento: i.avulso && i.recebedor && i.tipoPagamento ? formatDateForApi(new Date()) : undefined
    }));

    this.agendamentoService.concluirEmLote({ atendimentos: itens }).subscribe({
      next: (resultado) => {
        this.salvandoLote.set(false);
        if (resultado.falhas.length === 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `${resultado.concluidos} atendimento(s) concluído(s)`
          });
          this.fecharModalLote();
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Concluído parcialmente',
            detail: `${resultado.concluidos} concluído(s), ${resultado.falhas.length} falharam: ${resultado.falhas.map(f => f.motivo).join('; ')}`
          });
        }
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        this.salvandoLote.set(false);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }

  constructor(
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.menuAcoes.set([
      { label: 'Nova assinatura mensal', icon: 'pi pi-id-card', routerLink: '/financeiro/assinaturas', queryParams: { nova: true } },
      { label: 'Fechar atendimentos', icon: 'pi pi-check-square', command: () => this.abrirModalLote() },
      { label: 'Filtrar por paciente ou serviço', icon: 'pi pi-filter', command: () => this.toggleFiltros() }
    ]);
    const relogio = setInterval(() => this.agora.set(new Date()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
    this.carregarDados();
  }

  carregarDados(): void {
    this.carregandoAgenda.set(true);
    this.erroCatalogoAgenda.set('');
    // Pacientes e serviços em paralelo; eventos só depois — assim os títulos
    // sempre resolvem os nomes (sem "Paciente #42") e a API é chamada uma vez
    forkJoin({
      pacientes: this.pacienteService.listar(),
      servicos: this.servicoService.listar()
    }).subscribe({
      next: ({ pacientes, servicos }) => {
        this.pacientes.set(pacientes);
        this.servicos.set(servicos);
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.erroCatalogoAgenda.set('Não conseguimos carregar os nomes de pacientes e serviços. Tente novamente antes de cadastrar.');
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
        // Mesmo sem nomes, ainda mostra a agenda
        this.carregarEventos();
      }
    });
  }

  carregarEventos(): void {
    const consulta = ++this.consultaAgenda;
    this.carregandoAgenda.set(true);
    this.erroAgenda.set('');
    // Monta parâmetros de filtro para a API (apenas data e paciente para otimizar)
    const params: any = {};

    if (this.filtros.dataInicio) {
      const dataInicio = new Date(this.filtros.dataInicio);
      dataInicio.setHours(0, 0, 0, 0);
      params.dataInicio = formatDateTimeForApi(dataInicio);
    }

    if (this.filtros.dataFim) {
      const dataFim = new Date(this.filtros.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      params.dataFim = formatDateTimeForApi(dataFim, true);
    }

    if (this.filtros.pacienteId) {
      params.pacienteId = this.filtros.pacienteId;
    }

    this.agendamentoService.listar(params).subscribe({
      next: (atendimentos) => {
        if (consulta !== this.consultaAgenda) return;
        this.carregandoAgenda.set(false);
        const eventos: AgendaEvento[] = [];
        atendimentos.forEach(atendimento => {
          const isMensalista = ehMensalidade(atendimento);

          // Busca o nome do paciente e serviço para exibir no título
          const paciente = this.pacientes().find(p => p.id === atendimento.pacienteId);
          const servico = this.servicos().find(s => s.id === atendimento.servicoBaseId);
          const pacienteNome = paciente?.nome || `Paciente #${atendimento.pacienteId}`;
          const servicoNome = servico?.nome || `Serviço #${atendimento.servicoBaseId}`;
          const servicoTipo = obterTipoServico(servicoNome, servico?.tipo);

          const title = isMensalista
            ? `📋 ${pacienteNome} - ${servicoNome}`
            : `${pacienteNome} - ${servicoNome}`;

          eventos.push({
            id: atendimento.id.toString(),
            title: title,
            start: atendimento.dataHoraInicio,
            end: atendimento.dataHoraFim,
            extendedProps: {
              atendimento: atendimento,
              isMensalista: isMensalista,
              pacienteNome,
              servicoNome,
              servicoTipo
            }
          });
        });
        this.eventos.set(eventos);
        this.aplicarFiltros();
      },
      error: (error) => {
        if (consulta !== this.consultaAgenda) return;
        this.carregandoAgenda.set(false);
        this.erroAgenda.set(ErrorHandlerUtil.getErrorMessage(error).detail);
      }
    });
  }

  aplicarFiltros(): void {
    const fontes = new Map(this.eventos().map(evento => [(evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO).id, evento]));
    let grupos = agruparAtendimentos([...fontes.values()].map(evento => evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO), this.filtros);
    if (!this.configuracoes.atual().agruparAgenda) grupos = grupos.flatMap(g => g.participantes.map(p => ({chave:`individual-${p.id}`,participantes:[p]})));
    this.eventosFiltrados.set(grupos.map(grupo => {
      const primeiro = fontes.get(grupo.participantes[0].id)!;
      if (grupo.participantes.length === 1) return {...primeiro, extendedProps: {...primeiro.extendedProps, participantes: grupo.participantes}};
      return {...primeiro, id: grupo.chave, title: `${primeiro.extendedProps?.['servicoNome']} · ${grupo.participantes.length} participantes`,
        extendedProps: {...primeiro.extendedProps, atendimento: undefined, pacienteNome: `${grupo.participantes.length} participantes`, participantes: grupo.participantes}};
    }));
  }

  toggleFiltros(): void {
    this.filtrosVisiveis.set(!this.filtrosVisiveis());
  }

  limparFiltros(): void {
    this.filtros = {
      status: [],
      pacienteId: null,
      servicoId: null,
      dataInicio: null,
      dataFim: null
    };
    this.carregarEventos();
  }

  readonly rotuloStatus = obterLabelStatus;

  /** "quarta-feira, 18 de novembro · 14:00 – 15:00" */
  subtituloAtendimento(): string {
    const a = this.atendimentoSelecionado();
    if (!a) return '';
    const inicio = new Date(a.dataHoraInicio);
    const dia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(inicio);
    const diaMaiusculo = dia.charAt(0).toUpperCase() + dia.slice(1);
    return `${diaMaiusculo} · ${formatHora(inicio)}${a.dataHoraFim ? ' – ' + formatHora(new Date(a.dataHoraFim)) : ''}`;
  }

  quantidadeNoDia(dia: Date): number {
    return this.contagensPorDia()[chaveDia(dia)] ?? 0;
  }

  /** Gaveta à direita no desktop; folha inferior no celular. */
  estiloGaveta(): Record<string, string> {
    return this.isTablet()
      ? { width: '100vw', maxHeight: '92dvh', margin: '0', borderRadius: '16px 16px 0 0' }
      : { width: 'min(480px, 100vw)', height: '100dvh', maxHeight: '100dvh', margin: '0', borderRadius: '0' };
  }

  estiloModalNovo(): Record<string, string> {
    return this.isTablet()
      ? { width: '100vw', maxHeight: '92dvh', margin: '0', borderRadius: '16px 16px 0 0' }
      : { width: '92vw', maxWidth: '560px', maxHeight: '90vh' };
  }

  /** O modal de criação pode ser fechado pelo X e pelo Esc; o de edição só pelos botões (guarda da ficha). */
  aoMudarVisibilidadeNovo(visivel: boolean): void {
    if (!visivel && this.modalVisivel && !this.atendimentoSelecionado()) this.descartarEFechar();
  }

  /** Clique num bloco da linha do tempo: turma abre a lista de participantes, atendimento único abre o detalhe. */
  selecionarEvento(evento: EventoDoDiaUI): void {
    if (evento.participantes.length > 1) { this.turmaSelecionada.set(evento.participantes); this.modalTurmaVisivel = true; return; }
    this.abrirModalEdicao(evento.atendimento);
  }

  /** Clique num horário vazio: abre a criação no dia exibido, no horário (já arredondado a 30 min). */
  criarNoHorario(hora: string): void {
    this.abrirNovoAgendamentoDoDia(hora);
  }

  // --- Cancelar / registrar falta (ações rápidas do detalhe) ---
  confirmacaoStatus = signal<'CANCELADO' | 'FALTA' | null>(null);

  pedirStatusRapido(status: 'CANCELADO' | 'FALTA'): void {
    if (!this.atendimentoSelecionado() || this.salvando()) return;
    if (this.motivoBloqueioFicha() || this.temAlteracoesPendentes()) { this.avisarFichaPendente(); return; }
    this.confirmacaoStatus.set(status);
  }

  confirmarStatusRapido(): void {
    const status = this.confirmacaoStatus();
    const atendimento = this.atendimentoSelecionado();
    if (!status || !atendimento || this.salvando()) return;
    this.salvando.set(true);
    this.agendamentoService.atualizar(atendimento.id, { status }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: status === 'CANCELADO' ? 'Atendimento cancelado' : 'Falta registrada', detail: `${atendimento.pacienteNome ?? 'Paciente'} · ${obterLabelStatus(status)}` });
        this.salvando.set(false);
        this.confirmacaoStatus.set(null);
        this.descartarEFechar();
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
        this.salvando.set(false);
      }
    });
  }

  // --- Recorrência: resumo e dias da semana (ISO: segunda = 1 … domingo = 7) ---
  alternarDiaSemana(dia: number): void {
    this.diasSemanaSelecionados = this.diasSemanaSelecionados.includes(dia)
      ? this.diasSemanaSelecionados.filter(d => d !== dia)
      : [...this.diasSemanaSelecionados, dia];
  }

  /** Quantos atendimentos a recorrência vai gerar por paciente (sem dias marcados, repete no dia da semana da data inicial). */
  quantidadeRecorrencia(): number {
    const inicio = this.novoAgendamento.dataHora;
    if (!this.repetirAgendamento || !inicio || !this.dataFimRecorrencia) return 0;
    const fim = this.iniciarDoDia(this.dataFimRecorrencia);
    const dias = this.diasSemanaSelecionados.length ? this.diasSemanaSelecionados : [inicio.getDay() === 0 ? 7 : inicio.getDay()];
    let total = 0;
    for (let d = this.iniciarDoDia(inicio); d <= fim && total < 366; d.setDate(d.getDate() + 1)) {
      if (dias.includes(d.getDay() === 0 ? 7 : d.getDay())) total++;
    }
    return total;
  }

  abrirModalEdicao(atendimento: AtendimentoResponseDTO): void {
    if (this.modalVisivel && this.temAlteracoesPendentes()) { this.avisarFichaPendente(); return; }
    const abertura = ++this.aberturaAtendimento;
    this.resumoFichaSalvo = '';
    this.temFichaEstruturada = false;
    this.estadoFicha.set({dirty:false,carregando:true,salvando:false,conflito:false,carregado:false,versao:0,resumo:''});
    this.atendimentoSelecionado.set({...atendimento});
    this.modalVisivel = true;
    this.modalTurmaVisivel = false;
    this.erroAtendimento.set('');
    this.carregandoAtendimento.set(true);
    this.agendamentoService.buscarPorId(atendimento.id).subscribe({
      next: atual => {
        if (abertura !== this.aberturaAtendimento) return;
        this.preencherEdicao(atual);
        this.carregandoAtendimento.set(false);
      },
      error: () => {
        if (abertura !== this.aberturaAtendimento) return;
        this.erroAtendimento.set('Não foi possível carregar o atendimento atualizado. Feche e tente novamente.');
        this.carregandoAtendimento.set(false);
      }
    });
  }

  private preencherEdicao(atendimento: AtendimentoResponseDTO): void {
    // Usa os dados que já vêm do backend
    const paciente = this.pacientes().find(p => p.id === atendimento.pacienteId);
    const servico = this.servicos().find(s => s.id === atendimento.servicoBaseId);

    this.atendimentoSelecionado.set({
      ...atendimento,
      pacienteNome: paciente?.nome || 'Carregando...',
      servicoNome: servico?.nome || 'Carregando...'
    });

    this.modalTurmaVisivel = false;
    this.dataPagamentoEdit = atendimento.dataPagamento ? new Date(`${atendimento.dataPagamento}T12:00:00`) : null;
    this.dataHoraEdit = new Date(atendimento.dataHoraInicio);
    this.dataHoraOriginal = new Date(atendimento.dataHoraInicio);
    const { data, hora } = separarDataHora(this.dataHoraEdit);
    this.dataEdit = data;
    // Mostra o horário EXATO do atendimento (nunca arredondar: salvar mudaria
    // o horário real silenciosamente). Se não estiver na grade de 30min,
    // adiciona como opção extra do select.
    this.horaEdit = hora;
    this.horariosEdicao = montarHorariosComExtra(this.horariosDisponiveis, hora);
    this.statusEdit = atendimento.status;
    this.evolucaoOriginal = atendimento.evolucao || '';
    this.evolucaoEdit = this.evolucaoOriginal;
    this.recebedorEdit = atendimento.recebedor || null;
    this.tipoPagamentoEdit = atendimento.tipoPagamento || null;
    this.modalVisivel = true;

    // Se não encontrou os nomes, busca do backend
    if (!paciente || !servico) {
      if (!paciente) {
        this.pacienteService.buscarPorId(atendimento.pacienteId).subscribe({
          next: (p) => {
            if (this.atendimentoSelecionado()?.id !== atendimento.id) return;
            this.atendimentoSelecionado.set({
              ...this.atendimentoSelecionado()!,
              pacienteNome: p.nome
            });
          }
        });
      }
      if (!servico) {
        this.servicoService.buscarPorId(atendimento.servicoBaseId).subscribe({
          next: (s) => {
            if (this.atendimentoSelecionado()?.id !== atendimento.id) return;
            this.atendimentoSelecionado.set({
              ...this.atendimentoSelecionado()!,
              servicoNome: s.nome
            });
          }
        });
      }
    }
  }

  abrirModalNovoAgendamento(): boolean {
    if (this.modalVisivel && this.temAlteracoesPendentes()) { this.avisarFichaPendente(); return false; }
    ++this.aberturaAtendimento;
    this.erroAtendimento.set('');
    this.carregandoAtendimento.set(false);
    this.atendimentoSelecionado.set(null);
    this.novoAgendamento = {
      pacienteIds: [],
      servicoId: null,
      dataHora: null
    };
    this.dataNovoAgendamento = null;
    this.horaNovoAgendamento = null;
    this.repetirAgendamento = false;
    this.dataFimRecorrencia = null;
    this.diasSemanaSelecionados = [];
    this.modalVisivel = true;
    return true;
  }

  private temAlteracoesPendentes(): boolean {
    const estado = this.estadoFicha();
    return !!this.atendimentoSelecionado() && (estado.dirty || estado.conflito || estado.salvando);
  }

  private avisarFichaPendente(): void {
    this.messageService.add({severity:'warn',summary:'Evolução pendente',detail:this.motivoBloqueioFicha() || 'Salve ou descarte as alterações antes de trocar de atendimento.'});
  }

  fecharModal(): void {
    if (this.salvando() || (this.atendimentoSelecionado() && this.estadoFicha().salvando)) {
      this.messageService.add({severity:'warn',summary:'Salvamento em andamento',detail:'Aguarde terminar o salvamento antes de fechar.'});
      return;
    }
    if (this.temAlteracoesPendentes()) { this.modalDescartarVisivel.set(true); return; }
    this.descartarEFechar();
  }

  descartarEFechar(): void {
    if (this.salvando() || (this.atendimentoSelecionado() && this.estadoFicha().salvando)) return;
    ++this.aberturaAtendimento;
    this.modalDescartarVisivel.set(false);
    this.modalVisivel = false;
    this.atendimentoSelecionado.set(null);
    this.dataHoraOriginal = null;
    this.carregandoAtendimento.set(false);
  }

  /**
   * Atualiza dataHoraEdit quando data ou hora são alterados
   */
  atualizarDataHoraEdit(): void {
    this.dataHoraEdit = combinarDataHora(this.dataEdit, this.horaEdit);
  }

  /**
   * Atualiza novoAgendamento.dataHora quando data ou hora são alterados
   */
  atualizarDataHoraNovoAgendamento(): void {
    this.novoAgendamento.dataHora = combinarDataHora(this.dataNovoAgendamento, this.horaNovoAgendamento);
  }

  salvarAtendimento(): void {
    const atendimento = this.atendimentoSelecionado();
    if (!atendimento) return;
    if (this.motivoBloqueioFicha()) { this.avisarFichaPendente(); return; }

    const isConcluido = this.statusEdit === 'CONCLUIDO';
    const ehAtendimentoAvulso = this.ehAtendimentoAvulso(atendimento);
    if (isConcluido && ehAtendimentoAvulso && (this.recebedorEdit || this.tipoPagamentoEdit) && (!this.recebedorEdit || !this.tipoPagamentoEdit || !this.dataPagamentoEdit)) {
      this.messageService.add({severity: 'warn', summary: 'Recebimento incompleto', detail: 'Informe recebedor, forma e data do recebimento para confirmar o pagamento.'});
      return;
    }

    // Não exige recebedor/tipoPagamento. Mensalistas pagam via cobrança mensal.
    // Avulsos podem concluir sem preencher (ficam PAYMENT_PENDING) ou preencher (ficam PAID).

    if (isConcluido && !(this.temFichaEstruturada ? this.resumoFichaSalvo : this.evolucaoEdit).trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Evolução é obrigatória para concluir o atendimento'
      });
      return;
    }

    this.salvando.set(true);

    const updateData: any = { status: this.statusEdit };
    // A ficha possui seu próprio versionamento. PUT de status/horário nunca regrava seu resumo.
    if (!this.temFichaEstruturada && this.estadoFicha().versao === 0 && this.evolucaoEdit !== this.evolucaoOriginal) updateData.evolucao = this.evolucaoEdit;

    // Só envia data/hora se o usuário realmente alterou — editar apenas a
    // evolução não pode mudar o horário do atendimento
    if (this.dataHoraEdit && this.dataHoraOriginal &&
        this.dataHoraEdit.getTime() !== this.dataHoraOriginal.getTime()) {
      // Formato local esperado pelo backend; toISOString() deslocaria o horário para UTC
      updateData.dataHoraInicio = formatDateTimeForApiBody(this.dataHoraEdit);
    }

    if (ehAtendimentoAvulso && isConcluido) {
      updateData.recebedor = this.recebedorEdit;
      updateData.tipoPagamento = this.tipoPagamentoEdit;
      if (this.dataPagamentoEdit && this.recebedorEdit && this.tipoPagamentoEdit) updateData.dataPagamento = formatDateForApi(this.dataPagamentoEdit);
    }

    this.agendamentoService.atualizar(atendimento.id, updateData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Atendimento atualizado com sucesso'
        });
        this.salvando.set(false);
        this.fecharModal();
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
        this.salvando.set(false);
      }
    });
  }

  criarAgendamento(): void {
    if (!this.novoAgendamento.pacienteIds || this.novoAgendamento.pacienteIds.length === 0 || !this.novoAgendamento.servicoId || !this.novoAgendamento.dataHora) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios (selecione pelo menos um paciente)'
      });
      return;
    }

    // Validação de recorrência
    if (this.repetirAgendamento && !this.dataFimRecorrencia) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Informe a data final da recorrência'
      });
      return;
    }

    if (this.repetirAgendamento && this.dataFimRecorrencia && this.novoAgendamento.dataHora) {
      const dataInicio = new Date(this.novoAgendamento.dataHora);
      const dataFim = new Date(this.dataFimRecorrencia);

      if (dataFim <= dataInicio) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atenção',
          detail: 'A data final da recorrência deve ser maior que a data inicial'
        });
        return;
      }
    }

    this.salvando.set(true);

    // Formato local esperado pelo backend; toISOString() deslocaria o horário para UTC
    const dataHora = this.novoAgendamento.dataHora instanceof Date
      ? this.novoAgendamento.dataHora
      : new Date(this.novoAgendamento.dataHora);

    const agendamentoData: AgendamentoRequestDTO = {
      pacienteIds: this.novoAgendamento.pacienteIds,
      servicoId: this.novoAgendamento.servicoId!,
      dataHora: formatDateTimeForApiBody(dataHora)
    };

    // Adiciona campos de recorrência se necessário
    if (this.repetirAgendamento && this.dataFimRecorrencia) {
      agendamentoData.dataFimRecorrencia = formatDateForApi(this.dataFimRecorrencia);

      // Adiciona dias da semana se selecionados
      if (this.diasSemanaSelecionados && this.diasSemanaSelecionados.length > 0) {
        agendamentoData.diasSemana = this.diasSemanaSelecionados;
      }
    }

    this.agendamentoService.criar(agendamentoData).subscribe({
      next: (atendimentosCriados) => {
        const quantidade = atendimentosCriados.length;
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `${quantidade} agendamento(s) criado(s) com sucesso!`
        });
        this.salvando.set(false);
        this.fecharModal();
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
        this.salvando.set(false);
      }
    });
  }
}

