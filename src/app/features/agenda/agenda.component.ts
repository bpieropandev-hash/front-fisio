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
import { AtendimentoResponseDTO, AgendamentoRequestDTO } from '../../core/interfaces/agendamento.interface';
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
      <div class="header-actions">
        <p-button
          [label]="filtrosVisiveis() ? 'Ocultar Filtros' : 'Filtros'"
          [icon]="filtrosVisiveis() ? 'pi pi-times' : 'pi pi-filter'"
          (onClick)="toggleFiltros()"
          [outlined]="!filtrosVisiveis()"
        />
        <p-button
          label="Novo Agendamento"
          icon="pi pi-plus"
          (onClick)="abrirModalNovoAgendamento()"
        />
      </div>
    </div>

    <!-- Painel de Filtros (Oculto por padrão) -->
    @if (filtrosVisiveis()) {
      <p-card class="filters-card">
        <div class="filters-header">
          <h3>
            <i class="pi pi-filter"></i>
            Filtros
          </h3>
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
              [appendTo]="'body'"
              [showIcon]="true"
              [showButtonBar]="true"
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
              [appendTo]="'body'"
              [showIcon]="true"
              [showButtonBar]="true"
            />
          </div>

          <div class="filter-group filter-actions">
            <p-button
              label="Limpar Filtros"
              icon="pi pi-times"
              (onClick)="limparFiltros()"
              styleClass="p-button-text"
            />
            <p-button
              label="Aplicar Filtros"
              icon="pi pi-check"
              (onClick)="aplicarFiltros()"
            />
          </div>
        </div>
      </p-card>
    }

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
          <div class="datetime-selector">
            <p-datepicker
              [(ngModel)]="dataEdit"
              dateFormat="dd/mm/yy"
              styleClass="full-width date-input"
              [appendTo]="'body'"
              [showIcon]="true"
              [showButtonBar]="true"
              (onSelect)="atualizarDataHoraEdit()"
            />
            <p-select
              [(ngModel)]="horaEdit"
              [options]="horariosDisponiveis"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione o horário"
              styleClass="full-width time-input"
              [appendTo]="'body'"
              (ngModelChange)="atualizarDataHoraEdit()"
            />
          </div>
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
            rows="8"
            placeholder="Digite a evolução do atendimento..."
            styleClass="full-width evolution-textarea"
            [ngClass]="'evolution-textarea'"
            class="evolution-textarea"
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
          <label>Pacientes *</label>
          <p-multiSelect
            [(ngModel)]="novoAgendamento.pacienteIds"
            [options]="pacientes()"
            optionLabel="nome"
            optionValue="id"
            placeholder="Selecione um ou mais pacientes"
            styleClass="full-width"
            [appendTo]="'body'"
            [showClear]="true"
            [filter]="true"
            filterPlaceholder="Buscar pacientes..."
          />
          <small class="text-muted">Você pode selecionar múltiplos pacientes para o mesmo agendamento</small>
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
          <div class="datetime-selector">
            <p-datepicker
              [(ngModel)]="dataNovoAgendamento"
              dateFormat="dd/mm/yy"
              styleClass="full-width date-input"
              [appendTo]="'body'"
              [showIcon]="true"
              [showButtonBar]="true"
              (onSelect)="atualizarDataHoraNovoAgendamento()"
            />
            <p-select
              [(ngModel)]="horaNovoAgendamento"
              [options]="horariosDisponiveis"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione o horário"
              styleClass="full-width time-input"
              [appendTo]="'body'"
              (ngModelChange)="atualizarDataHoraNovoAgendamento()"
            />
          </div>
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
              [appendTo]="'body'"
              [showIcon]="true"
              [showButtonBar]="true"
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
      gap: 1rem;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .header-actions ::ng-deep .p-button {
      height: 2.5rem !important;
      min-height: 2.5rem !important;
      padding: 0.625rem 1.25rem !important;
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

    /* Estilos específicos para o textarea de evolução - com máxima especificidade */
    ::ng-deep textarea.evolution-textarea.p-inputtextarea,
    ::ng-deep .p-inputtextarea.evolution-textarea,
    ::ng-deep textarea[styleclass*="evolution-textarea"],
    ::ng-deep textarea.evolution-textarea {
      font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 15px !important;
      line-height: 1.8 !important;
      letter-spacing: 0.015em !important;
      padding: 20px 24px !important;
      border: 2px solid #e2e8f0 !important;
      border-radius: 12px !important;
      background: #ffffff !important;
      color: #1e293b !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      resize: vertical !important;
      min-height: 160px !important;
      width: 100% !important;
      box-shadow: 
        0 1px 3px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(0, 0, 0, 0.04) !important;
    }

    ::ng-deep textarea.evolution-textarea.p-inputtextarea:hover,
    ::ng-deep .p-inputtextarea.evolution-textarea:hover,
    ::ng-deep textarea.evolution-textarea:hover {
      border-color: #cbd5e1 !important;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(0, 0, 0, 0.06) !important;
      transform: translateY(-1px) !important;
      background: #fafbfc !important;
    }

    ::ng-deep textarea.evolution-textarea.p-inputtextarea:focus,
    ::ng-deep .p-inputtextarea.evolution-textarea:focus,
    ::ng-deep textarea.evolution-textarea:focus {
      outline: none !important;
      border-color: #4cc9f0 !important;
      box-shadow: 
        0 0 0 4px rgba(76, 201, 240, 0.12),
        0 8px 24px rgba(76, 201, 240, 0.15),
        0 2px 8px rgba(0, 0, 0, 0.08) !important;
      background: #ffffff !important;
      transform: translateY(-2px) !important;
    }

    ::ng-deep textarea.evolution-textarea.p-inputtextarea::placeholder,
    ::ng-deep .p-inputtextarea.evolution-textarea::placeholder,
    ::ng-deep textarea.evolution-textarea::placeholder {
      color: #94a3b8 !important;
      opacity: 0.7 !important;
      font-weight: 400 !important;
    }

    .datetime-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      align-items: end;
    }

    .datetime-selector .date-input {
      flex: 1;
    }

    .datetime-selector .time-input {
      flex: 1;
    }

    @media (max-width: 768px) {
      .datetime-selector {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
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

    /* Estilo discreto e elegante para o indicador de horário atual */
    ::ng-deep .fc-timegrid-now-indicator-line {
      border-color: #64748b !important;
      border-width: 1px !important;
      border-style: dashed !important;
      opacity: 0.6 !important;
      z-index: 5 !important;
    }

    ::ng-deep .fc-timegrid-now-indicator-arrow {
      border-color: transparent !important;
      background-color: transparent !important;
    }

    /* Melhorar visibilidade do indicador */
    ::ng-deep .fc-timegrid-now-indicator-container {
      pointer-events: none !important;
    }

    .filters-card {
      margin-bottom: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .filters-header {
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
      gap: 0.5rem;
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

      .header-actions {
        flex-direction: column;
        width: 100%;
      }

      .header-actions .p-button {
        width: 100%;
      }

      .filter-actions {
        flex-direction: column-reverse;
      }

      .filter-actions .p-button {
        width: 100%;
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
    const atendimento = info.event.extendedProps['atendimento'] as AtendimentoResponseDTO;
    this.abrirModalEdicao(atendimento);
  }

  onDateClick(info: any): void {
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

