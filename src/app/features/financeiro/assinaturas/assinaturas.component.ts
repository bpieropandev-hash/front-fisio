import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AssinaturaService } from '../../../core/services/assinatura.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ServicoService } from '../../../core/services/servico.service';
import { AssinaturaResponseDTO, AssinaturaCreateRequestDTO } from '../../../core/interfaces/assinatura.interface';
import { PacienteResponseDTO } from '../../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../../core/interfaces/servico.interface';

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
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
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
        <label>Paciente *</label>
        <p-select
          [(ngModel)]="novaAssinatura.pacienteId"
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

  novaAssinatura: AssinaturaCreateRequestDTO = {
    pacienteId: 0,
    servicoId: 0,
    valorMensal: 0,
    diaVencimento: 5,
    dataInicio: undefined
  };

  constructor(
    private assinaturaService: AssinaturaService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService
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
      error: (error) => {
        console.error('Erro ao carregar assinaturas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar assinaturas'
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
    this.novaAssinatura = {
      pacienteId: 0,
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
    if (!this.novaAssinatura.pacienteId || !this.novaAssinatura.servicoId || !this.novaAssinatura.valorMensal || !this.novaAssinatura.diaVencimento) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);

    const data: AssinaturaCreateRequestDTO = {
      ...this.novaAssinatura,
      dataInicio: this.novaAssinatura.dataInicio || new Date().toISOString().split('T')[0]
    };

    this.assinaturaService.criar(data).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Assinatura criada com sucesso'
        });
        this.fecharModal();
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao criar assinatura'
        });
        this.salvando.set(false);
      }
    });
  }
}

