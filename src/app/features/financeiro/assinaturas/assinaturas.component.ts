import { Component, OnInit, signal } from '@angular/core';
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

    <p-table
      [value]="assinaturas()"
      [paginator]="true"
      [rows]="10"
      [loading]="carregando()"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>ID</th>
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
          <td>{{ assinatura.id }}</td>
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
  pacientes = signal<PacienteResponseDTO[]>([]);
  servicos = signal<ServicoResponseDTO[]>([]);
  modalVisivel = signal(false);
  _modalVisivel = false;
  carregando = signal(false);
  salvando = signal(false);

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
        this.assinaturas.set(assinaturas);
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
}

