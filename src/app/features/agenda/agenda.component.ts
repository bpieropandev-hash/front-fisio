import { untracked } from '@angular/core';
import { ConfiguracaoClinicaService } from '../../core/services/configuracao-clinica.service';
import { Component, OnInit, signal, computed, effect, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventContentArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelect } from 'primeng/multiselect';
import { Checkbox } from 'primeng/checkbox';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { AtendimentoResponseDTO, AgendamentoRequestDTO, ConcluirAtendimentoLoteItemDTO } from '../../core/interfaces/agendamento.interface';
import { PacienteResponseDTO } from '../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../core/interfaces/servico.interface';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { formatDateTimeForApi, formatDateTimeForApiBody, formatDateForApi } from '../../core/utils/date-format.util';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';
import {
  obterCoresPorStatus,
  obterTipoServico,
  obterLabelStatus,
  formatHora,
  obterSiglaTipoServico,
  normalizarStatusClass,
  combinarDataHora,
  separarDataHora,
  montarHorariosComExtra
} from './agenda-event.util';
import { EvolucaoFichaComponent, EvolucaoFichaEstado } from '../../shared/components/evolucao-ficha/evolucao-ficha.component';
import { ReciboDialogComponent } from '../../shared/components/recibo-dialog/recibo-dialog.component';
import { OrigemRecibo } from '../../core/interfaces/recibo.interface';
import { agruparAtendimentos, ehMensalidade, podeEmitirReciboAtendimento } from './agenda-group.util';
import { RouterLink } from '@angular/router';
import { obterPillStatus } from '../../core/utils/status-pill.util';

const DIAS_SEMANA_CURTO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export interface EventoDoDiaUI {
  atendimento: AtendimentoResponseDTO;
  participantes: AtendimentoResponseDTO[];
  chave: string;
  hora: string;
  pacienteNome: string;
  servicoNome: string;
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
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    Dialog,
    Button,
    Textarea,
    Select,
    DatePicker,
    ToggleSwitchModule,
    MultiSelect,
    Checkbox,
    Card,
    Toast, EvolucaoFichaComponent, ReciboDialogComponent, RouterLink
  ],
  providers: [MessageService],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss']
})
export class AgendaComponent implements OnInit {
  readonly configuracoes = inject(ConfiguracaoClinicaService);
  private readonly atualizarAgrupamento = effect(() => { this.configuracoes.atual(); untracked(() => this.aplicarFiltros()); });
  private readonly breakpointService = inject(BreakpointService);
  isMobile = this.breakpointService.isMobile;
  isTablet = this.breakpointService.isTablet;
  obterPillStatus = obterPillStatus;

  @ViewChild(EvolucaoFichaComponent) fichaComponent?: EvolucaoFichaComponent;
  @ViewChild(FullCalendarComponent) calendarComponent?: FullCalendarComponent;

  // --- Shell mobile (spec 10) — semana + lista do dia, substitui o FullCalendar em telas estreitas ---
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
      .filter(evento => this.mesmoDia(new Date(evento.start as string), dia))
      .map(evento => {
        const participantes = evento.extendedProps?.['participantes'] as AtendimentoResponseDTO[];
        const atendimento = participantes[0];
        return {
          atendimento, participantes, chave: String(evento.id),
          hora: formatHora(new Date(evento.start as string)),
          pacienteNome: (evento.extendedProps?.['pacienteNome'] as string) || '',
          servicoNome: (evento.extendedProps?.['servicoNome'] as string) || ''
        };
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
  });

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
    this.diaSelecionadoAgenda.set(this.iniciarDoDia(data));
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

  abrirNovoAgendamentoDoDia(): void {
    this.abrirModalNovoAgendamento();
    // abrirModalNovoAgendamento() zera dataNovoAgendamento — reaplica com o dia selecionado na lista
    this.dataNovoAgendamento = new Date(this.diaSelecionadoAgenda());
  }

  /** View atual do calendário. FullCalendar só respeita `initialView` na montagem —
   * mudanças depois disso precisam chamar calendarApi.changeView() (ver effect no constructor). */
  calendarView = signal<string>(this.breakpointService.isMobile() ? 'timeGridDay' : 'dayGridMonth');

  modalVisivel = false;
  atendimentoSelecionado = signal<AtendimentoResponseDTO & { pacienteNome?: string; servicoNome?: string } | null>(null);
  salvando = signal(false);
  pacientes = signal<PacienteResponseDTO[]>([]);
  servicos = signal<ServicoResponseDTO[]>([]);
  eventos = signal<EventInput[]>([]);
  eventosFiltrados = signal<EventInput[]>([]);
  filtrosVisiveis = signal(false);
  private ignoreNextDateClick = false;

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
  complementoEdit = '';
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
    if (this.complementoEdit.trim()) return 'Leve o complemento para Observações e salve a ficha antes de concluir, ou descarte o complemento explicitamente.';
    return '';
  }

  levarComplementoParaFicha(): void {
    const complemento = this.complementoEdit.trim();
    if (!complemento || !this.fichaComponent || this.estadoFicha().salvando || this.estadoFicha().conflito || !this.estadoFicha().carregado) return;
    const observacoes = this.fichaComponent.form.controls.observacoes;
    const texto = [observacoes.value.trim(), complemento].filter(Boolean).join('\n');
    if (texto.length > 5000) {
      this.messageService.add({severity:'warn',summary:'Complemento preservado',detail:'As observações ficariam com mais de 5.000 caracteres. Reduza o texto antes de transferir.'});
      return;
    }
    observacoes.setValue(texto);
    observacoes.markAsDirty();
    this.complementoEdit = '';
  }

  descartarComplemento(): void { this.complementoEdit = ''; }

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
  carregandoLote = signal(false);
  salvandoLote = signal(false);
  itensLote = signal<ItemLoteUI[]>([]);

  abrirModalLote(): void {
    this.pacienteLoteId = null;
    this.itensLote.set([]);
    this.modalLoteVisivel = true;
  }

  fecharModalLote(): void {
    this.modalLoteVisivel = false;
  }

  aoSelecionarPacienteLote(): void {
    if (!this.pacienteLoteId) {
      this.itensLote.set([]);
      return;
    }

    this.carregandoLote.set(true);
    this.agendamentoService.listar({ pacienteId: this.pacienteLoteId }).subscribe({
      next: (atendimentos) => {
        const agora = new Date();
        const itens: ItemLoteUI[] = atendimentos
          .filter(a => a.status === 'AGENDADO' && new Date(a.dataHoraInicio) < agora)
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
        this.itensLote.set(itens);
        this.carregandoLote.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.carregandoLote.set(false);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
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

  calendarOptions = computed<CalendarOptions>(() => {
    const mobile = this.isMobile();
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: this.calendarView(),
      headerToolbar: mobile
        ? { left: 'prev,next', center: 'title', right: 'today' }
        : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
      locale: ptBrLocale,
      events: this.eventosFiltrados(),
      eventDisplay: 'block',
      eventClick: (info) => this.onEventClick(info),
      dateClick: (info) => this.onDateClick(info),
      dayMaxEventRows: 3,
      moreLinkText: (n) => `+${n} mais`,
      eventContent: (arg) => this.renderEventContent(arg),
      eventClassNames: (arg) => {
        const atendimento = arg.event.extendedProps?.['atendimento'] as AtendimentoResponseDTO | undefined;
        const status = normalizarStatusClass(atendimento?.status);
        return status ? [`status-${status}`] : [];
      },
      eventDidMount: (info) => this.onEventDidMount(info),
      // Drag & drop não é confiável em touch — em mobile, reagendar é feito pelo
      // modal de edição (clique no evento), que já existe e cobre o mesmo fluxo.
      editable: !mobile,
      // Duração não é editável: o backend não expõe atualização de dataHoraFim
      eventDurationEditable: false,
      eventDrop: (info) => this.onEventDrop(info),
      nowIndicator: true,
      slotMinTime: '06:00:00',
      slotMaxTime: '22:00:00'
    };
  });

  constructor(
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService
  ) {
    // `initialView` só é respeitado pelo wrapper do FullCalendar na montagem —
    // mudanças de view depois disso (seletor mobile ou troca de breakpoint em
    // runtime) precisam ser aplicadas via API imperativa.
    effect(() => {
      const view = this.calendarView();
      this.calendarComponent?.getApi()?.changeView(view);
    });

    // Ao cruzar o breakpoint mobile/desktop, volta para a view padrão de cada modo.
    // Não interfere em uma escolha manual de view feita sem cruzar o breakpoint.
    effect(() => {
      this.calendarView.set(this.isMobile() ? 'timeGridDay' : 'dayGridMonth');
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    // Pacientes e serviços em paralelo; eventos só depois — assim os títulos
    // sempre resolvem os nomes (sem "Paciente #42") e a API é chamada uma vez
    forkJoin({
      pacientes: this.pacienteService.listar(),
      servicos: this.servicoService.listar()
    }).subscribe({
      next: ({ pacientes, servicos }) => {
        this.pacientes.set(pacientes.filter(p => p.ativo !== false));
        this.servicos.set(servicos.filter(s => s.ativo !== false));
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
        // Mesmo sem nomes, ainda mostra a agenda
        this.carregarEventos();
      }
    });
  }

  carregarEventos(): void {
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
        const eventos: EventInput[] = [];
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

          // Cores: manter por STATUS (fundo/borda/texto)
          const coresStatus = obterCoresPorStatus(atendimento.status);

          eventos.push({
            id: atendimento.id.toString(),
            title: title,
            start: atendimento.dataHoraInicio,
            end: atendimento.dataHoraFim,
            backgroundColor: coresStatus.backgroundColor,
            borderColor: coresStatus.borderColor,
            textColor: coresStatus.textColor,
            classNames: (() => {
              const status = normalizarStatusClass(atendimento.status);
              return status ? [`status-${status}`] : [];
            })(),
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
        console.error('Erro ao carregar atendimentos:', error);
        this.eventos.set([]);
        this.eventosFiltrados.set([]);
      }
    });
  }

  private renderEventContent(arg: EventContentArg) {
    // Month: minimalista. Week/Day: render explícito (para não sumir quando eventContent existe)
    if (arg.view.type !== 'dayGridMonth') {
      const container = document.createElement('div');
      container.className = 'fc-event-title';
      container.textContent = arg.event.title;
      return { domNodes: [container] };
    }

    const atendimento = arg.event.extendedProps?.['atendimento'] as AtendimentoResponseDTO | undefined;
    const pacienteNome = (arg.event.extendedProps?.['pacienteNome'] as string | undefined) || '';
    const servicoNome = (arg.event.extendedProps?.['servicoNome'] as string | undefined) || arg.event.title;
    const servicoTipo = (arg.event.extendedProps?.['servicoTipo'] as string | undefined) || '';
    const statusLabel = obterLabelStatus(atendimento?.status);

    const inicio = arg.event.start;
    const hora = formatHora(inicio);
    const sigla = obterSiglaTipoServico(servicoTipo);

    // Tooltip (title nativo) com quebras de linha
    const tooltip = [
      `Paciente: ${pacienteNome || '—'}`,
      `Tipo: ${servicoTipo || '—'}`,
      `Serviço: ${servicoNome || '—'}`,
      `Horário: ${hora || '—'}`,
      `Status: ${statusLabel || '—'}`
    ].join('\n');

    const container = document.createElement('div');
    container.className = 'fc-month-min';
    container.title = tooltip;
    container.setAttribute('aria-label', tooltip);

    const badge = document.createElement('span');
    badge.className = 'fc-month-min__badge';
    badge.textContent = sigla;
    container.appendChild(badge);

    if (hora) {
      const time = document.createElement('span');
      time.className = 'fc-month-min__time';
      time.textContent = hora;
      container.appendChild(time);
    }

    const name = document.createElement('span');
    name.className = 'fc-month-min__name';
    name.textContent = pacienteNome || arg.event.title;
    container.appendChild(name);

    return { domNodes: [container] };
  }

  private onEventDidMount(info: any): void {
    const atendimento = info?.event?.extendedProps?.['atendimento'] as AtendimentoResponseDTO | undefined;
    const status = atendimento?.status;
    if (!status || !info?.el) return;

    const cores = obterCoresPorStatus(status);
    const el = info.el as HTMLElement;

    // Elemento principal
    el.style.backgroundColor = cores.backgroundColor;
    el.style.borderColor = cores.borderColor;
    el.style.color = cores.textColor;

    // TimeGrid: a área pintada costuma ser .fc-event-main
    const main = el.querySelector('.fc-event-main') as HTMLElement | null;
    if (main) {
      main.style.backgroundColor = cores.backgroundColor;
      main.style.borderColor = cores.borderColor;
      main.style.color = cores.textColor;
    }

    // DayGrid "dot event": pinta o dot
    const dot = el.querySelector('.fc-daygrid-event-dot') as HTMLElement | null;
    if (dot) {
      dot.style.borderColor = cores.borderColor;
    }
  }

  aplicarFiltros(): void {
    const fontes = new Map(this.eventos().map(evento => [(evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO).id, evento]));
    let grupos = agruparAtendimentos([...fontes.values()].map(evento => evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO), this.filtros);
    if (!this.configuracoes.atual().agruparAgenda) grupos = grupos.flatMap(g => g.participantes.map(p => ({chave:`individual-${p.id}`,participantes:[p]})));
    this.eventosFiltrados.set(grupos.map(grupo => {
      const primeiro = fontes.get(grupo.participantes[0].id)!;
      if (grupo.participantes.length === 1) return {...primeiro, extendedProps: {...primeiro.extendedProps, participantes: grupo.participantes}};
      const status = new Set(grupo.participantes.map(p => p.status));
      const cores = obterCoresPorStatus(status.size === 1 ? grupo.participantes[0].status : 'MISTO');
      return {...primeiro, ...cores, id: grupo.chave, title: `${primeiro.extendedProps?.['servicoNome']} · ${grupo.participantes.length} participantes`,
        editable: false, startEditable: false, classNames: [], extendedProps: {...primeiro.extendedProps, atendimento: undefined, pacienteNome: `${grupo.participantes.length} participantes`, participantes: grupo.participantes}};
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

  onEventClick(info: any): void {
    // Impede que o clique no evento dispare também o dateClick (muito comum no dayGridMonth)
    if (info?.jsEvent) {
      info.jsEvent.preventDefault?.();
      info.jsEvent.stopPropagation?.();
      info.jsEvent.stopImmediatePropagation?.();
    }
    // Camada extra: alguns cliques disparam dateClick programaticamente (especialmente no mês)
    this.ignoreNextDateClick = true;
    setTimeout(() => (this.ignoreNextDateClick = false), 0);
    const participantes = info.event.extendedProps['participantes'] as AtendimentoResponseDTO[] | undefined;
    if (participantes && participantes.length > 1) { this.turmaSelecionada.set(participantes); this.modalTurmaVisivel = true; return; }
    const atendimento = info.event.extendedProps['atendimento'] as AtendimentoResponseDTO;
    this.abrirModalEdicao(atendimento);
  }

  onDateClick(info: any): void {
    if (this.ignoreNextDateClick) return;
    // Evita conflito: clicar em um evento não deve disparar dateClick (abrir "Novo Agendamento")
    const target = info?.jsEvent?.target as HTMLElement | null | undefined;
    if (target) {
      const clicouEmEvento = !!target.closest('.fc-event');
      const clicouEmMais = !!target.closest('.fc-more-link, .fc-daygrid-more-link');
      if (clicouEmEvento || clicouEmMais) return;
    }

    const dataSelecionada = new Date(info.date);
    // Arredonda para o intervalo de 30 minutos MAIS PRÓXIMO
    // (clicar às 10:00 em ponto sugere 10:00, não 10:30)
    const totalMinutos = dataSelecionada.getHours() * 60 + dataSelecionada.getMinutes();
    const arredondado = Math.round(totalMinutos / 30) * 30;
    const horasAjustadas = Math.floor(arredondado / 60) % 24;
    const minutosArredondados = arredondado % 60;

    // Define a data (sem hora)
    this.dataNovoAgendamento = new Date(dataSelecionada);
    this.dataNovoAgendamento.setHours(0, 0, 0, 0);

    // Define a hora no formato HH:MM
    this.horaNovoAgendamento = `${String(horasAjustadas).padStart(2, '0')}:${String(minutosArredondados).padStart(2, '0')}`;

    // Combina data e hora
    this.novoAgendamento.dataHora = combinarDataHora(this.dataNovoAgendamento, this.horaNovoAgendamento);

    this.abrirModalNovoAgendamento();
  }

  /** Arrastar evento no calendário = remarcar o atendimento. Persiste ou reverte. */
  onEventDrop(info: any): void {
    const atendimento = info?.event?.extendedProps?.['atendimento'] as AtendimentoResponseDTO | undefined;
    const novaData: Date | null = info?.event?.start ?? null;

    if (info?.event?.extendedProps?.['participantes']?.length > 1 || !atendimento || !novaData) {
      info?.revert?.();
      return;
    }

    this.agendamentoService.atualizar(atendimento.id, {
      dataHoraInicio: formatDateTimeForApiBody(novaData)
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Remarcado',
          detail: `Atendimento movido para ${novaData.toLocaleDateString('pt-BR')} às ${formatHora(novaData)}`
        });
        this.carregarEventos();
      },
      error: (error: HttpErrorResponse) => {
        info?.revert?.();
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({ severity: msg.severity, summary: msg.summary, detail: msg.detail });
      }
    });
  }

  abrirModalEdicao(atendimento: AtendimentoResponseDTO): void {
    if (this.modalVisivel && this.temAlteracoesPendentes()) { this.avisarFichaPendente(); return; }
    const abertura = ++this.aberturaAtendimento;
    this.complementoEdit = '';
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

  abrirModalNovoAgendamento(): void {
    if (this.modalVisivel && this.temAlteracoesPendentes()) { this.avisarFichaPendente(); return; }
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
  }

  private temAlteracoesPendentes(): boolean {
    const estado = this.estadoFicha();
    return !!this.atendimentoSelecionado() && (estado.dirty || estado.conflito || estado.salvando || !!this.complementoEdit.trim());
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
    this.complementoEdit = '';
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

