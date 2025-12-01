import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { AtendimentoResponseDTO } from '../../core/interfaces/agendamento.interface';
import { PacienteResponseDTO } from '../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../core/interfaces/servico.interface';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    InputSwitchModule,
    MultiSelectModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="agenda-header">
      <h2>Agenda de Atendimentos</h2>
      <p-button
        label="Novo Agendamento"
        icon="pi pi-plus"
        (onClick)="abrirModalNovoAgendamento()"
      />
    </div>

    <!-- Painel de Filtros -->
    <p-card class="filters-card">
      <div class="filters-header">
        <h3>
          <i class="pi pi-filter"></i>
          Filtros
        </h3>
        <p-button
          label="Limpar Filtros"
          icon="pi pi-times"
          (onClick)="limparFiltros()"
          styleClass="p-button-text p-button-sm"
        />
      </div>
      
      <div class="filters-grid">
        <div class="filter-group">
          <label>Status</label>
          <p-multiSelect
            [(ngModel)]="filtros.status"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Todos os status"
            styleClass="full-width"
            [appendTo]="'body'"
            [showClear]="true"
          />
        </div>

        <div class="filter-group">
          <label>Paciente</label>
          <p-select
            [(ngModel)]="filtros.pacienteId"
            [options]="pacientes()"
            optionLabel="nome"
            optionValue="id"
            placeholder="Todos os pacientes"
            styleClass="full-width"
            [appendTo]="'body'"
            [showClear]="true"
          />
        </div>

        <div class="filter-group">
          <label>Serviço</label>
          <p-select
            [(ngModel)]="filtros.servicoId"
            [options]="servicos()"
            optionLabel="nome"
            optionValue="id"
            placeholder="Todos os serviços"
            styleClass="full-width"
            [appendTo]="'body'"
            [showClear]="true"
          />
        </div>

        <div class="filter-group">
          <label>Data Início</label>
          <p-datepicker
            [(ngModel)]="filtros.dataInicio"
            dateFormat="dd/mm/yy"
            [showTime]="false"
            styleClass="full-width"
            placeholder="Selecione a data"
          />
        </div>

        <div class="filter-group">
          <label>Data Fim</label>
          <p-datepicker
            [(ngModel)]="filtros.dataFim"
            dateFormat="dd/mm/yy"
            [showTime]="false"
            styleClass="full-width"
            placeholder="Selecione a data"
          />
        </div>

        <div class="filter-group filter-actions">
          <p-button
            label="Aplicar Filtros"
            icon="pi pi-check"
            (onClick)="aplicarFiltros()"
            styleClass="full-width"
          />
        </div>
      </div>
    </p-card>

    <!-- Legenda de Status -->
    <div class="status-legend">
      <div class="legend-item">
        <span class="legend-color agendado"></span>
        <span>Agendado</span>
      </div>
      <div class="legend-item">
        <span class="legend-color concluido"></span>
        <span>Concluído</span>
      </div>
      <div class="legend-item">
        <span class="legend-color cancelado"></span>
        <span>Cancelado</span>
      </div>
      <div class="legend-item">
        <span class="legend-color falta"></span>
        <span>Falta</span>
      </div>
    </div>

    <full-calendar [options]="calendarOptions()" />

    <!-- Modal de Edição/Baixa -->
    <p-dialog
      [(visible)]="_modalVisivel"
      [header]="atendimentoSelecionado() ? 'Editar Atendimento' : 'Novo Agendamento'"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px', maxHeight: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="fecharModal()"
    >
      @if (atendimentoSelecionado()) {
        <div class="form-group">
          <label>Paciente</label>
          <p>{{ atendimentoSelecionado()?.pacienteNome || 'Carregando...' }}</p>
        </div>

        <div class="form-group">
          <label>Serviço</label>
          <p>{{ atendimentoSelecionado()?.servicoNome || 'Carregando...' }}</p>
        </div>

        <div class="form-group">
          <label>Data/Hora</label>
          <p-datepicker
            [(ngModel)]="dataHoraEdit"
            [showTime]="true"
            [hourFormat]="'24'"
            dateFormat="dd/mm/yy"
            styleClass="full-width"
          />
        </div>

        <div class="form-group">
          <label>Status</label>
          <p-select
            [(ngModel)]="statusEdit"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="full-width"
            [appendTo]="'body'"
          />
        </div>

        <div class="form-group">
          <label>Evolução</label>
          <textarea
            pInputTextarea
            [(ngModel)]="evolucaoEdit"
            rows="6"
            placeholder="Digite a evolução do atendimento..."
            styleClass="full-width evolution-textarea"
          ></textarea>
        </div>

        @if (atendimentoSelecionado()?.valorCobrado && atendimentoSelecionado()!.valorCobrado > 0) {
          <div class="form-group">
            <label>Recebedor *</label>
            <p-select
              [(ngModel)]="recebedorEdit"
              [options]="recebedorOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="full-width"
              [required]="statusEdit === 'CONCLUIDO'"
              [appendTo]="'body'"
            />
          </div>

          <div class="form-group">
            <label>Tipo de Pagamento *</label>
            <p-select
              [(ngModel)]="tipoPagamentoEdit"
              [options]="tipoPagamentoOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="full-width"
              [required]="statusEdit === 'CONCLUIDO'"
              [appendTo]="'body'"
            />
          </div>
        } @else {
          <div class="mensalista-badge">
            <i class="pi pi-id-card"></i> Mensalista - Sem cobrança
          </div>
        }

        <div class="dialog-footer">
          <p-button
            label="Cancelar"
            icon="pi pi-times"
            (onClick)="fecharModal()"
            styleClass="p-button-text"
          />
          <p-button
            label="Salvar"
            icon="pi pi-check"
            (onClick)="salvarAtendimento()"
            [loading]="salvando()"
          />
        </div>
      } @else {
        <!-- Formulário de Novo Agendamento -->
        <div class="form-group">
          <label>Paciente *</label>
          <p-select
            [(ngModel)]="novoAgendamento.pacienteId"
            [options]="pacientes()"
            optionLabel="nome"
            optionValue="id"
            placeholder="Selecione o paciente"
            styleClass="full-width"
            [appendTo]="'body'"
          />
        </div>

        <div class="form-group">
          <label>Serviço *</label>
          <p-select
            [(ngModel)]="novoAgendamento.servicoId"
            [options]="servicos()"
            optionLabel="nome"
            optionValue="id"
            placeholder="Selecione o serviço"
            styleClass="full-width"
            [appendTo]="'body'"
          />
        </div>

        <div class="form-group">
          <label>Data/Hora *</label>
          <p-datepicker
            [(ngModel)]="novoAgendamento.dataHora"
            [showTime]="true"
            [hourFormat]="'24'"
            dateFormat="dd/mm/yy"
            styleClass="full-width"
          />
        </div>

        <div class="form-group">
          <div class="flex align-items-center gap-2">
            <p-inputSwitch [(ngModel)]="repetirAgendamento" />
            <label>Repetir agendamento?</label>
          </div>
        </div>

        @if (repetirAgendamento) {
          <div class="form-group">
            <label>Repetir até *</label>
            <p-datepicker
              [(ngModel)]="dataFimRecorrencia"
              [showTime]="false"
              dateFormat="dd/mm/yy"
              styleClass="full-width"
            />
          </div>

          <div class="form-group">
            <label>Dias da Semana</label>
            <p-multiSelect
              [(ngModel)]="diasSemanaSelecionados"
              [options]="diasSemanaOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione os dias da semana"
              styleClass="full-width"
              [appendTo]="'body'"
            />
            <small class="text-muted">Selecione os dias da semana. Se nenhum for selecionado, repetirá no mesmo dia da semana da data inicial.</small>
          </div>
        }

        <div class="dialog-footer">
          <p-button
            label="Cancelar"
            icon="pi pi-times"
            (onClick)="fecharModal()"
            styleClass="p-button-text"
          />
          <p-button
            label="Criar"
            icon="pi pi-check"
            (onClick)="criarAgendamento()"
            [loading]="salvando()"
          />
        </div>
      }
    </p-dialog>
  `,
  styles: [`
    .agenda-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .full-width {
      width: 100%;
    }

    .mensalista-badge {
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 4px;
      color: #1976d2;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    .text-muted {
      color: #64748b;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      display: block;
    }

    .flex {
      display: flex;
    }

    .align-items-center {
      align-items: center;
    }

    .gap-2 {
      gap: 0.5rem;
    }

    ::ng-deep .fc-event-title {
      white-space: normal;
    }

    ::ng-deep .mensalista-event {
      background-color: #4caf50 !important;
      border-color: #4caf50 !important;
    }

    .filters-card {
      margin-bottom: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .filters-header h3 {
      margin: 0;
      color: #1e293b;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filters-header i {
      color: #64748b;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .filter-group label {
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #1e293b;
      font-size: 0.875rem;
    }

    .filter-actions {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }

    .status-legend {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #64748b;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid;
    }

    .legend-color.agendado {
      background-color: #a5d6a7;
      border-color: #66bb6a;
    }

    .legend-color.concluido {
      background-color: #90caf9;
      border-color: #42a5f5;
    }

    .legend-color.cancelado {
      background-color: #ef9a9a;
      border-color: #e57373;
    }

    .legend-color.falta {
      background-color: #fff59d;
      border-color: #ffd54f;
    }

    @media (max-width: 768px) {
      .agenda-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .agenda-header h2 {
        font-size: 1.5rem;
        margin: 0;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .status-legend {
        gap: 0.75rem;
        padding: 0.75rem;
        font-size: 0.875rem;
      }

      .filters-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .filters-header h3 {
        font-size: 1rem;
      }

      ::ng-deep .fc-toolbar {
        flex-direction: column;
        gap: 0.5rem;
      }

      ::ng-deep .fc-toolbar-chunk {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      ::ng-deep .fc-button {
        padding: 0.375rem 0.5rem !important;
        font-size: 0.875rem !important;
      }

      ::ng-deep .fc-event-title {
        font-size: 0.75rem !important;
        padding: 2px 4px !important;
      }

      .dialog-footer {
        flex-direction: column-reverse;
      }

      .dialog-footer .p-button {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .agenda-header h2 {
        font-size: 1.25rem;
      }

      .status-legend {
        flex-direction: column;
        gap: 0.5rem;
      }

      ::ng-deep .fc-header-toolbar {
        font-size: 0.75rem;
      }

      ::ng-deep .fc-daygrid-day-number,
      ::ng-deep .fc-timegrid-slot-label {
        font-size: 0.75rem !important;
      }
    }

  `]
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
  
  filtros = {
    status: [] as string[],
    pacienteId: null as number | null,
    servicoId: null as number | null,
    dataInicio: null as Date | null,
    dataFim: null as Date | null
  };
  
  dataHoraEdit: Date | null = null;
  statusEdit: string = 'AGENDADO';
  evolucaoEdit: string = '';
  recebedorEdit: 'CLINICA' | 'PROFISSIONAL' | null = null;
  tipoPagamentoEdit: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | null = null;

  novoAgendamento = {
    pacienteId: null as number | null,
    servicoId: null as number | null,
    dataHora: null as Date | null
  };

  repetirAgendamento = false;
  dataFimRecorrencia: Date | null = null;
  diasSemanaSelecionados: number[] = [];

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
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: ptBrLocale,
    events: this.eventosFiltrados(),
    eventClick: (info) => this.onEventClick(info),
    dateClick: (info) => this.onDateClick(info),
    editable: true,
    eventResize: (info) => this.onEventResize(info),
    eventDrop: (info) => this.onEventDrop(info)
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
          
          const title = isMensalista 
            ? `📋 ${pacienteNome} - ${servicoNome}`
            : `${pacienteNome} - ${servicoNome}`;
          
          // Obtém cores baseadas no status
          const cores = this.obterCoresPorStatus(atendimento.status);
          
          eventos.push({
            id: atendimento.id.toString(),
            title: title,
            start: atendimento.dataHoraInicio,
            backgroundColor: cores.backgroundColor,
            borderColor: cores.borderColor,
            textColor: cores.textColor,
            extendedProps: {
              atendimento: atendimento,
              isMensalista: isMensalista
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
          backgroundColor: '#a5d6a7', // Verde claro
          borderColor: '#66bb6a',
          textColor: '#1b5e20'
        };
      case 'CONCLUIDO':
        return {
          backgroundColor: '#90caf9', // Azul claro
          borderColor: '#42a5f5',
          textColor: '#0d47a1'
        };
      case 'CANCELADO':
        return {
          backgroundColor: '#ef9a9a', // Vermelho claro
          borderColor: '#e57373',
          textColor: '#b71c1c'
        };
      case 'FALTA':
        return {
          backgroundColor: '#fff59d', // Amarelo claro
          borderColor: '#ffd54f',
          textColor: '#f57f17'
        };
      default:
        return {
          backgroundColor: '#e0e0e0', // Cinza
          borderColor: '#bdbdbd',
          textColor: '#424242'
        };
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
    const atendimento = info.event.extendedProps['atendimento'] as AtendimentoResponseDTO;
    this.abrirModalEdicao(atendimento);
  }

  onDateClick(info: any): void {
    this.novoAgendamento.dataHora = info.date;
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
      pacienteId: null,
      servicoId: null,
      dataHora: null
    };
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
    if (!this.novoAgendamento.pacienteId || !this.novoAgendamento.servicoId || !this.novoAgendamento.dataHora) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
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

    const agendamentoData: any = {
      pacienteId: this.novoAgendamento.pacienteId,
      servicoId: this.novoAgendamento.servicoId,
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

