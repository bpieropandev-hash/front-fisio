import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AssinaturaService } from '../../../core/services/assinatura.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ServicoService } from '../../../core/services/servico.service';
import { AssinaturaResponseDTO, AssinaturaCreateRequestDTO } from '../../../core/interfaces/assinatura.interface';
import { PacienteResponseDTO } from '../../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../../core/interfaces/servico.interface';
import { ErrorHandlerUtil } from '../../../core/utils/error-handler.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-assinaturas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    MultiSelectModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    
    <div class="page-header">
      <h2>Assinaturas</h2>
      <p-button
        label="Nova Assinatura"
        icon="pi pi-plus"
        (onClick)="abrirModalNovaAssinatura()"
      />
    </div>

    <div class="search-container">
      <div class="search-wrapper">
        <input
          type="text"
          pInputText
          placeholder="Pesquisar por paciente, serviço, valor..."
          [ngModel]="termoPesquisa()"
          (ngModelChange)="termoPesquisa.set($event)"
          class="search-input"
        />
        @if (termoPesquisa()) {
          <p-button
            icon="pi pi-times"
            (onClick)="limparPesquisa()"
            styleClass="p-button-text p-button-rounded p-button-plain clear-button"
            pTooltip="Limpar pesquisa"
            [rounded]="true"
          />
        }
      </div>
      @if (termoPesquisa() && assinaturasFiltradas().length > 0) {
        <div class="search-results-info">
          <i class="pi pi-info-circle"></i>
          <span>{{ assinaturasFiltradas().length }} assinatura(s) encontrada(s)</span>
        </div>
      }
      @if (termoPesquisa() && assinaturasFiltradas().length === 0) {
        <div class="search-no-results">
          <i class="pi pi-search"></i>
          <span>Nenhuma assinatura encontrada com o termo "{{ termoPesquisa() }}"</span>
        </div>
      }
    </div>

    <p-table
      [value]="assinaturasFiltradas()"
      [paginator]="true"
      [rows]="10"
      [loading]="carregando()"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Paciente</th>
          <th>Serviço</th>
          <th>Valor Mensal</th>
          <th>Dia Vencimento</th>
          <th>Data Início</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-assinatura>
        <tr>
          <td>{{ assinatura.pacienteNome }}</td>
          <td>{{ assinatura.servicoNome }}</td>
          <td>{{ assinatura.valorMensal | currency: 'BRL' }}</td>
          <td>{{ assinatura.diaVencimento }}</td>
          <td>{{ assinatura.dataInicio | date: 'dd/MM/yyyy' }}</td>
          <td>
            <p-tag
              [value]="assinatura.ativo ? 'Ativa' : 'Inativa'"
              [severity]="assinatura.ativo ? 'success' : 'danger'"
            />
          </td>
          <td>
            @if (assinatura.ativo) {
              <p-button
                icon="pi pi-times"
                label="Cancelar"
                severity="danger"
                (onClick)="confirmarCancelamento(assinatura)"
                styleClass="p-button-sm"
              />
            }
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Modal Nova Assinatura -->
    <p-dialog
      [(visible)]="_modalVisivel"
      header="Nova Assinatura"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="fecharModal()"
    >
      <div class="form-group">
        <label>Paciente(s) *</label>
        <p-multiSelect
          [(ngModel)]="pacienteIdsSelecionados"
          [options]="pacientes()"
          optionLabel="nome"
          optionValue="id"
          placeholder="Selecione um ou mais pacientes"
          styleClass="full-width"
          [appendTo]="'body'"
        />
      </div>

      <div class="form-group">
        <label>Serviço *</label>
        <p-select
          [(ngModel)]="novaAssinatura.servicoId"
          [options]="servicos()"
          optionLabel="nome"
          optionValue="id"
          placeholder="Selecione o serviço"
          styleClass="full-width"
          [appendTo]="'body'"
        />
      </div>

      <div class="form-group">
        <label>Valor Mensal *</label>
        <p-inputNumber
          [(ngModel)]="novaAssinatura.valorMensal"
          mode="currency"
          currency="BRL"
          locale="pt-BR"
          styleClass="full-width"
        />
      </div>

      <div class="form-group">
        <label>Dia de Vencimento *</label>
        <p-inputNumber
          [(ngModel)]="novaAssinatura.diaVencimento"
          [min]="1"
          [max]="28"
          placeholder="Dia do mês (1-28)"
          styleClass="full-width"
        />
      </div>

      <div class="form-group">
        <label>Data de Início</label>
        <input
          type="date"
          pInputText
          [(ngModel)]="novaAssinatura.dataInicio"
          styleClass="full-width"
        />
      </div>

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
          (onClick)="criarAssinatura()"
          [loading]="salvando()"
        />
      </div>
    </p-dialog>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .search-container {
      margin-bottom: 24px;
    }

    .search-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-primary);
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border-color);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .search-wrapper:focus-within {
      box-shadow: 0 4px 16px rgba(76, 201, 240, 0.15);
      border-color: #4cc9f0;
      transform: translateY(-1px);
    }

    .search-input {
      flex: 1;
      width: 100%;
      font-size: larger;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .search-input:focus {
      outline: none;
      border-color: #4cc9f0;
      box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.1);
      background: var(--bg-primary);
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    .clear-button {
      min-width: 40px;
      height: 40px;
      padding: 0;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      border-radius: 50%;
    }

    .clear-button:hover {
      background: rgba(76, 201, 240, 0.1);
      color: #4cc9f0;
      transform: scale(1.1) rotate(90deg);
    }

    .search-results-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(76, 201, 240, 0.1);
      color: #0ea5e9;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      animation: fadeIn 0.3s ease;
      border-left: 3px solid #4cc9f0;
    }

    .search-results-info i {
      font-size: 1rem;
    }

    .search-no-results {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
      padding: 24px;
      background: var(--bg-secondary);
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 0.95rem;
      animation: fadeIn 0.3s ease;
      border: 1px dashed var(--border-color);
    }

    .search-no-results i {
      font-size: 1.5rem;
      color: var(--text-tertiary);
      opacity: 0.6;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .page-header h2 {
        font-size: 1.5rem;
        margin: 0;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .dialog-footer {
        flex-direction: column-reverse;
      }

      .dialog-footer .p-button {
        width: 100%;
      }

      ::ng-deep .p-datatable {
        font-size: 0.875rem;
      }

      ::ng-deep .p-datatable .p-datatable-thead > tr > th,
      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.5rem !important;
        font-size: 0.75rem !important;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
    }

    @media (max-width: 480px) {
      .page-header h2 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class AssinaturasComponent implements OnInit {
  assinaturas = signal<AssinaturaResponseDTO[]>([]);
  termoPesquisa = signal<string>('');
  pacientes = signal<PacienteResponseDTO[]>([]);
  servicos = signal<ServicoResponseDTO[]>([]);
  modalVisivel = signal(false);
  _modalVisivel = false;
  carregando = signal(false);
  salvando = signal(false);

  assinaturasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const assinaturasLista = this.assinaturas();
    
    if (!termo) {
      return assinaturasLista;
    }

    return assinaturasLista.filter(assinatura => {
      const pacienteNome = assinatura.pacienteNome?.toLowerCase() || '';
      const servicoNome = assinatura.servicoNome?.toLowerCase() || '';
      const valorMensal = assinatura.valorMensal?.toString() || '';
      const diaVencimento = assinatura.diaVencimento?.toString() || '';
      
      return pacienteNome.includes(termo) || 
             servicoNome.includes(termo) || 
             valorMensal.includes(termo) ||
             diaVencimento.includes(termo);
    });
  });

  pacienteIdsSelecionados: number[] = [];
  novaAssinatura: Partial<AssinaturaCreateRequestDTO> = {
    servicoId: 0,
    valorMensal: 0,
    diaVencimento: 5,
    dataInicio: undefined
  };

  constructor(
    private assinaturaService: AssinaturaService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.carregando.set(true);
    this.assinaturaService.listar().subscribe({
      next: (assinaturas) => {
        // Ordenar assinaturas por nome do paciente (ASC)
        const assinaturasOrdenadas = assinaturas.sort((a, b) => {
          const nomeA = a.pacienteNome?.toLowerCase() || '';
          const nomeB = b.pacienteNome?.toLowerCase() || '';
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });
        this.assinaturas.set(assinaturasOrdenadas);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar assinaturas:', error);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
        this.carregando.set(false);
      }
    });

    this.pacienteService.listar().subscribe({
      next: (pacientes) => this.pacientes.set(pacientes.filter(p => p.ativo !== false))
    });

    this.servicoService.listar().subscribe({
      next: (servicos) => this.servicos.set(servicos.filter(s => s.ativo !== false))
    });
  }

  abrirModalNovaAssinatura(): void {
    this.pacienteIdsSelecionados = [];
    this.novaAssinatura = {
      servicoId: 0,
      valorMensal: 0,
      diaVencimento: 5,
      dataInicio: undefined
    };
    this.modalVisivel.set(true);
    this._modalVisivel = true;
  }

  fecharModal(): void {
    this.modalVisivel.set(false);
    this._modalVisivel = false;
  }

  criarAssinatura(): void {
    if (!this.pacienteIdsSelecionados || this.pacienteIdsSelecionados.length === 0 || !this.novaAssinatura.servicoId || !this.novaAssinatura.valorMensal || !this.novaAssinatura.diaVencimento) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);

    const data: AssinaturaCreateRequestDTO = {
      pacienteIds: this.pacienteIdsSelecionados,
      servicoId: this.novaAssinatura.servicoId!,
      valorMensal: this.novaAssinatura.valorMensal!,
      diaVencimento: this.novaAssinatura.diaVencimento!,
      dataInicio: this.novaAssinatura.dataInicio || new Date().toISOString().split('T')[0]
    };

    this.assinaturaService.criar(data).subscribe({
      next: (assinaturasCriadas) => {
        const quantidade = assinaturasCriadas.length;
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: quantidade === 1 
            ? 'Assinatura criada com sucesso' 
            : `${quantidade} assinaturas criadas com sucesso`
        });
        this.fecharModal();
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        // Mensagem específica para conflito (assinatura já existe)
        if (error.status === 409 || error.status === 400) {
          errorMessage.detail = errorMessage.detail || 'Erro ao criar assinatura(s). Verifique se os pacientes estão ativos e não possuem assinatura ativa para este serviço.';
        }
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
        this.salvando.set(false);
      }
    });
  }

  confirmarCancelamento(assinatura: AssinaturaResponseDTO): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja cancelar o plano de ${assinatura.pacienteNome}?`,
      header: 'Confirmar Cancelamento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, cancelar',
      rejectLabel: 'Não',
      accept: () => {
        this.cancelarAssinatura(assinatura.id);
      }
    });
  }

  cancelarAssinatura(id: number): void {
    this.salvando.set(true);
    this.assinaturaService.cancelar(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Assinatura cancelada com sucesso'
        });
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
        this.salvando.set(false);
      }
    });
  }

  limparPesquisa(): void {
    this.termoPesquisa.set('');
  }
}

