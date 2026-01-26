import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
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
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { AtendimentoResponseDTO, AgendamentoRequestDTO } from '../../core/interfaces/agendamento.interface';
import { PacienteResponseDTO } from '../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../core/interfaces/servico.interface';
import { MessageService } from 'primeng/api';

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
    Card,
    Toast
  ],
  providers: [MessageService],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss']
})
export class AgendaComponent implements OnInit {
  modalVisivel = signal(false);
  _modalVisivel = false;
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

  dataNovoAgendamento: Date | null = null;
  horaNovoAgendamento: string | null = null;

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

  tipoPagamentoOptions = [
    { label: 'Dinheiro', value: 'DINHEIRO' },
    { label: 'Cartão de Crédito', value: 'CARTAO_CREDITO' },
    { label: 'Cartão de Débito', value: 'CARTAO_DEBITO' },
    { label: 'PIX', value: 'PIX' }
  ];

  calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
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
      const status = this.normalizarStatusClass(atendimento?.status);
      return status ? [`status-${status}`] : [];
    },
    eventDidMount: (info) => this.onEventDidMount(info),
    editable: true,
    eventResize: (info) => this.onEventResize(info),
    eventDrop: (info) => this.onEventDrop(info),
    nowIndicator: true,
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00'
  }));

  constructor(
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes.filter(p => p.ativo !== false));
        // Carrega eventos após pacientes e serviços estarem disponíveis
        if (this.servicos().length > 0 || pacientes.length > 0) {
          this.carregarEventos();
        }
      },
      error: (error) => console.error('Erro ao carregar pacientes:', error)
    });

    this.servicoService.listar().subscribe({
      next: (servicos) => {
        this.servicos.set(servicos.filter(s => s.ativo !== false));
        // Carrega eventos após pacientes e serviços estarem disponíveis
        if (this.pacientes().length > 0 || servicos.length > 0) {
          this.carregarEventos();
        }
      },
      error: (error) => console.error('Erro ao carregar serviços:', error)
    });

    // Carrega eventos inicialmente
    this.carregarEventos();
  }

  carregarEventos(): void {
    // Monta parâmetros de filtro para a API (apenas data e paciente para otimizar)
    const params: any = {};

    if (this.filtros.dataInicio) {
      const dataInicio = new Date(this.filtros.dataInicio);
      dataInicio.setHours(0, 0, 0, 0);
      params.dataInicio = dataInicio.toISOString().replace('T', ' ').substring(0, 23);
    }

    if (this.filtros.dataFim) {
      const dataFim = new Date(this.filtros.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      params.dataFim = dataFim.toISOString().replace('T', ' ').substring(0, 23);
    }

    if (this.filtros.pacienteId) {
      params.pacienteId = this.filtros.pacienteId;
    }

    this.agendamentoService.listar(params).subscribe({
      next: (atendimentos) => {
        const eventos: EventInput[] = [];
        atendimentos.forEach(atendimento => {
          const isMensalista = atendimento.valorCobrado === 0;

          // Busca o nome do paciente e serviço para exibir no título
          const paciente = this.pacientes().find(p => p.id === atendimento.pacienteId);
          const servico = this.servicos().find(s => s.id === atendimento.servicoBaseId);
          const pacienteNome = paciente?.nome || `Paciente #${atendimento.pacienteId}`;
          const servicoNome = servico?.nome || `Serviço #${atendimento.servicoBaseId}`;
          const servicoTipo = this.obterTipoServico(servicoNome, servico?.tipo);

          const title = isMensalista
            ? `📋 ${pacienteNome} - ${servicoNome}`
            : `${pacienteNome} - ${servicoNome}`;

          // Cores: manter por STATUS (fundo/borda/texto)
          const coresStatus = this.obterCoresPorStatus(atendimento.status);

          eventos.push({
            id: atendimento.id.toString(),
            title: title,
            start: atendimento.dataHoraInicio,
            backgroundColor: coresStatus.backgroundColor,
            borderColor: coresStatus.borderColor,
            textColor: coresStatus.textColor,
            classNames: (() => {
              const status = this.normalizarStatusClass(atendimento.status);
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

  obterCoresPorStatus(status: string): { backgroundColor: string; borderColor: string; textColor: string } {
    switch (status) {
      case 'AGENDADO':
        return {
          backgroundColor: '#a5d6a7',
          borderColor: '#16a34a',
          textColor: '#1b5e20'
        };
      case 'CONCLUIDO':
        return {
          backgroundColor: '#90caf9',
          borderColor: '#2563eb',
          textColor: '#0d47a1'
        };
      case 'CANCELADO':
        return {
          backgroundColor: '#ef9a9a',
          borderColor: '#dc2626',
          textColor: '#b71c1c'
        };
      case 'FALTA':
        return {
          backgroundColor: '#fff59d',
          borderColor: '#ca8a04',
          textColor: '#f57f17'
        };
      default:
        return {
          backgroundColor: '#e0e0e0',
          borderColor: '#64748b',
          textColor: '#424242'
        };
    }
  }

  private obterTipoServico(servicoNome: string, servicoTipo?: string): 'PILATES' | 'FISIOTERAPIA' | 'AVALIACAO' | 'OUTRO' {
    const nome = (servicoNome || '').toLowerCase();
    if (nome.includes('avalia')) return 'AVALIACAO';
    // Preferir o tipo vindo do backend quando existir
    if (servicoTipo === 'PILATES') return 'PILATES';
    if (servicoTipo === 'FISIOTERAPIA') return 'FISIOTERAPIA';
    // Fallback por nome
    if (nome.includes('pilates')) return 'PILATES';
    if (nome.includes('fisio')) return 'FISIOTERAPIA';
    return 'OUTRO';
  }

  private obterLabelStatus(status: string | undefined): string {
    switch (status) {
      case 'AGENDADO':
        return 'Agendado';
      case 'CONCLUIDO':
        return 'Concluído';
      case 'CANCELADO':
        return 'Cancelado';
      case 'FALTA':
        return 'Falta';
      default:
        return status || '—';
    }
  }

  private formatHora(date: Date | null | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  private obterSiglaTipoServico(tipo: string | undefined): string {
    switch (tipo) {
      case 'PILATES':
        return 'PIL';
      case 'FISIOTERAPIA':
        return 'FIS';
      case 'AVALIACAO':
        return 'AVL';
      default:
        return 'OUT';
    }
  }

  private normalizarStatusClass(status: string | undefined): string {
    // Ex.: "CONCLUIDO" -> "concluido"
    return (status || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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
    const statusLabel = this.obterLabelStatus(atendimento?.status);

    const inicio = arg.event.start;
    const hora = this.formatHora(inicio);
    const sigla = this.obterSiglaTipoServico(servicoTipo);

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

    const cores = this.obterCoresPorStatus(status);
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
    // Aplica filtros nos eventos já carregados
    let eventosFiltrados = [...this.eventos()];

    // Filtro por status
    if (this.filtros.status.length > 0) {
      eventosFiltrados = eventosFiltrados.filter(evento => {
        const atendimento = evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO;
        return atendimento && this.filtros.status.includes(atendimento.status);
      });
    }

    // Filtro por paciente
    if (this.filtros.pacienteId) {
      eventosFiltrados = eventosFiltrados.filter(evento => {
        const atendimento = evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO;
        return atendimento && atendimento.pacienteId === this.filtros.pacienteId;
      });
    }

    // Filtro por serviço
    if (this.filtros.servicoId) {
      eventosFiltrados = eventosFiltrados.filter(evento => {
        const atendimento = evento.extendedProps?.['atendimento'] as AtendimentoResponseDTO;
        return atendimento && atendimento.servicoBaseId === this.filtros.servicoId;
      });
    }

    // Filtro por data início
    if (this.filtros.dataInicio) {
      const dataInicio = new Date(this.filtros.dataInicio);
      dataInicio.setHours(0, 0, 0, 0);
      eventosFiltrados = eventosFiltrados.filter(evento => {
        const eventoDate = new Date(evento.start as string);
        return eventoDate >= dataInicio;
      });
    }

    // Filtro por data fim
    if (this.filtros.dataFim) {
      const dataFim = new Date(this.filtros.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      eventosFiltrados = eventosFiltrados.filter(evento => {
        const eventoDate = new Date(evento.start as string);
        return eventoDate <= dataFim;
      });
    }

    this.eventosFiltrados.set(eventosFiltrados);
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
    // Arredonda para o próximo intervalo de 30 minutos
    const minutos = dataSelecionada.getMinutes();
    const minutosArredondados = minutos < 30 ? 30 : 0;
    const horasAjustadas = minutos >= 30 ? dataSelecionada.getHours() + 1 : dataSelecionada.getHours();

    // Define a data (sem hora)
    this.dataNovoAgendamento = new Date(dataSelecionada);
    this.dataNovoAgendamento.setHours(0, 0, 0, 0);

    // Define a hora no formato HH:MM
    this.horaNovoAgendamento = `${String(horasAjustadas).padStart(2, '0')}:${String(minutosArredondados).padStart(2, '0')}`;

    // Combina data e hora
    this.novoAgendamento.dataHora = this.combinarDataHora(this.dataNovoAgendamento, this.horaNovoAgendamento);

    this.abrirModalNovoAgendamento();
  }

  onEventResize(info: any): void {
    // Implementar atualização de data/hora
  }

  onEventDrop(info: any): void {
    // Implementar atualização de data/hora
  }

  abrirModalEdicao(atendimento: AtendimentoResponseDTO): void {
    // Usa os dados que já vêm do backend
    const paciente = this.pacientes().find(p => p.id === atendimento.pacienteId);
    const servico = this.servicos().find(s => s.id === atendimento.servicoBaseId);

    this.atendimentoSelecionado.set({
      ...atendimento,
      pacienteNome: paciente?.nome || 'Carregando...',
      servicoNome: servico?.nome || 'Carregando...'
    });

    this.dataHoraEdit = new Date(atendimento.dataHoraInicio);
    const { data, hora } = this.separarDataHora(this.dataHoraEdit);
    this.dataEdit = data;
    // Arredonda a hora para o intervalo de 30 minutos mais próximo
    if (hora) {
      const [horas, minutos] = hora.split(':').map(Number);
      const minutosArredondados = minutos < 15 ? 0 : minutos < 45 ? 30 : 0;
      const horasAjustadas = minutos >= 45 ? horas + 1 : horas;
      const horaArredondada = `${String(horasAjustadas).padStart(2, '0')}:${String(minutosArredondados).padStart(2, '0')}`;
      this.horaEdit = horaArredondada;
      // Atualiza dataHoraEdit com a hora arredondada
      this.dataHoraEdit = this.combinarDataHora(this.dataEdit, horaArredondada);
    } else {
      this.horaEdit = null;
    }
    this.statusEdit = atendimento.status;
    this.evolucaoEdit = atendimento.evolucao || '';
    this.recebedorEdit = atendimento.recebedor || null;
    this.tipoPagamentoEdit = atendimento.tipoPagamento || null;
    this.modalVisivel.set(true);
    this._modalVisivel = true;

    // Se não encontrou os nomes, busca do backend
    if (!paciente || !servico) {
      if (!paciente) {
        this.pacienteService.buscarPorId(atendimento.pacienteId).subscribe({
          next: (p) => {
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
    this.modalVisivel.set(true);
    this._modalVisivel = true;
  }

  fecharModal(): void {
    this.modalVisivel.set(false);
    this._modalVisivel = false;
    this.atendimentoSelecionado.set(null);
  }

  /**
   * Combina data e hora selecionadas em um objeto Date
   */
  private combinarDataHora(data: Date | null, hora: string | null): Date | null {
    if (!data || !hora) return null;

    const [horas, minutos] = hora.split(':').map(Number);
    const dataCombinada = new Date(data);
    dataCombinada.setHours(horas, minutos, 0, 0);
    return dataCombinada;
  }

  /**
   * Separa uma data/hora em data e hora
   */
  private separarDataHora(dataHora: Date | null): { data: Date | null; hora: string | null } {
    if (!dataHora) return { data: null, hora: null };

    const data = new Date(dataHora);
    data.setHours(0, 0, 0, 0);

    const horas = String(dataHora.getHours()).padStart(2, '0');
    const minutos = String(dataHora.getMinutes()).padStart(2, '0');
    const hora = `${horas}:${minutos}`;

    return { data, hora };
  }

  /**
   * Atualiza dataHoraEdit quando data ou hora são alterados
   */
  atualizarDataHoraEdit(): void {
    this.dataHoraEdit = this.combinarDataHora(this.dataEdit, this.horaEdit);
  }

  /**
   * Atualiza novoAgendamento.dataHora quando data ou hora são alterados
   */
  atualizarDataHoraNovoAgendamento(): void {
    this.novoAgendamento.dataHora = this.combinarDataHora(this.dataNovoAgendamento, this.horaNovoAgendamento);
  }

  salvarAtendimento(): void {
    const atendimento = this.atendimentoSelecionado();
    if (!atendimento) return;

    const isConcluido = this.statusEdit === 'CONCLUIDO';
    const temValor = atendimento.valorCobrado > 0;

    if (isConcluido && temValor && (!this.recebedorEdit || !this.tipoPagamentoEdit)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Recebedor e Tipo de Pagamento são obrigatórios para concluir atendimentos com valor'
      });
      return;
    }

    if (isConcluido && !this.evolucaoEdit) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Evolução é obrigatória para concluir o atendimento'
      });
      return;
    }

    this.salvando.set(true);

    const updateData: any = {
      status: this.statusEdit,
      evolucao: this.evolucaoEdit
    };

    if (this.dataHoraEdit) {
      updateData.dataHoraInicio = this.dataHoraEdit.toISOString();
    }

    if (temValor && isConcluido) {
      updateData.recebedor = this.recebedorEdit;
      updateData.tipoPagamento = this.tipoPagamentoEdit;
    }

    this.agendamentoService.atualizar(atendimento.id, updateData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Atendimento atualizado com sucesso'
        });
        this.fecharModal();
        this.carregarEventos();
        this.salvando.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao atualizar atendimento'
        });
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

    let dataHoraISO: string;
    if (this.novoAgendamento.dataHora instanceof Date) {
      dataHoraISO = this.novoAgendamento.dataHora.toISOString();
    } else if (typeof this.novoAgendamento.dataHora === 'string') {
      dataHoraISO = new Date(this.novoAgendamento.dataHora).toISOString();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Data/hora inválida'
      });
      this.salvando.set(false);
      return;
    }

    const agendamentoData: AgendamentoRequestDTO = {
      pacienteIds: this.novoAgendamento.pacienteIds,
      servicoId: this.novoAgendamento.servicoId!,
      dataHora: dataHoraISO
    };

    // Adiciona campos de recorrência se necessário
    if (this.repetirAgendamento && this.dataFimRecorrencia) {
      // Formata data fim no formato YYYY-MM-DD
      const dataFimISO = this.dataFimRecorrencia.toISOString().split('T')[0];
      agendamentoData.dataFimRecorrencia = dataFimISO;

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
        this.fecharModal();
        this.carregarEventos();
        this.salvando.set(false);
      },
      error: (error) => {
        console.error('Erro ao criar agendamento:', error);
        let errorMessage = 'Erro ao criar agendamento';

        if (error.status === 403) {
          errorMessage = 'Acesso negado. Verifique suas permissões ou faça login novamente.';
        } else if (error.status === 401) {
          errorMessage = 'Sessão expirada. Faça login novamente.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: errorMessage
        });
        this.salvando.set(false);
      }
    });
  }
}

