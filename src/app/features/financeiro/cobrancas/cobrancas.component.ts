import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';
import { CobrancaService } from '../../../core/services/cobranca.service';
import { AssinaturaService } from '../../../core/services/assinatura.service';
import {
  CobrancaMensalResponseDTO,
  CobrancaMensalUpdateRequestDTO,
  GerarCobrancasRequestDTO
} from '../../../core/interfaces/cobranca.interface';
import { AssinaturaResponseDTO } from '../../../core/interfaces/assinatura.interface';

@Component({
  selector: 'app-cobrancas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="page-header">
      <h2>Cobranças Mensais</h2>
      <div class="header-actions">
        <div class="gerar-mes-group">
          <p-inputNumber
            [(ngModel)]="mesGerar"
            [min]="1"
            [max]="12"
            placeholder="Mês"
            styleClass="mes-input"
          />
          <p-inputNumber
            [(ngModel)]="anoGerar"
            [min]="2020"
            placeholder="Ano"
            styleClass="ano-input"
          />
          <p-button
            label="Gerar Mês"
            icon="pi pi-calendar-plus"
            (onClick)="gerarMensalidades()"
            [loading]="gerando()"
          />
        </div>
      </div>
    </div>

    <p-table
      [value]="cobrancas()"
      [paginator]="true"
      [rows]="10"
      [loading]="carregando()"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>ID</th>
          <th>Descrição</th>
          <th>Mês/Ano</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Data Pagamento</th>
          <th>Recebedor</th>
          <th>Tipo Pagamento</th>
          <th>Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-cobranca>
        <tr>
          <td>{{ cobranca.id }}</td>
          <td>{{ cobranca.descricao }}</td>
          <td>{{ cobranca.mesReferencia }}/{{ cobranca.anoReferencia }}</td>
          <td>{{ cobranca.valor | currency: 'BRL' }}</td>
          <td>
              <p-tag
              [value]="cobranca.status === 'PAGO' ? 'Pago' : 'Pendente'"
              [severity]="cobranca.status === 'PAGO' ? 'success' : 'warn'"
            />
          </td>
          <td>{{ cobranca.dataPagamento | date: 'dd/MM/yyyy' }}</td>
          <td>{{ cobranca.recebedor || '-' }}</td>
          <td>{{ cobranca.tipoPagamento || '-' }}</td>
          <td>
            @if (cobranca.status === 'PENDENTE') {
              <p-button
                label="Dar Baixa"
                icon="pi pi-check"
                (onClick)="abrirModalBaixa(cobranca)"
                styleClass="p-button-sm"
              />
            }
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Modal Dar Baixa -->
    <p-dialog
      [(visible)]="_modalBaixaVisivel"
      header="Dar Baixa na Cobrança"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="fecharModalBaixa()"
    >
      <div class="form-group">
        <label>Data de Pagamento *</label>
        <p-datepicker
          [(ngModel)]="baixaData.dataPagamento"
          dateFormat="dd/mm/yy"
          styleClass="full-width"
        />
      </div>

      <div class="form-group">
        <label>Recebedor *</label>
        <p-select
          [(ngModel)]="baixaData.recebedor"
          [options]="recebedorOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione o recebedor"
          styleClass="full-width"
          [appendTo]="'body'"
        />
      </div>

      <div class="form-group">
        <label>Tipo de Pagamento *</label>
        <p-select
          [(ngModel)]="baixaData.tipoPagamento"
          [options]="tipoPagamentoOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione o tipo de pagamento"
          styleClass="full-width"
          [appendTo]="'body'"
        />
      </div>

      <div class="dialog-footer">
        <p-button
          label="Cancelar"
          icon="pi pi-times"
          (onClick)="fecharModalBaixa()"
          styleClass="p-button-text"
        />
        <p-button
          label="Confirmar Baixa"
          icon="pi pi-check"
          (onClick)="confirmarBaixa()"
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
      flex-wrap: wrap;
      gap: 10px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .gerar-mes-group {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .mes-input {
      width: 100px;
    }

    .ano-input {
      width: 120px;
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

      .header-actions {
        flex-direction: column;
        width: 100%;
      }

      .gerar-mes-group {
        flex-direction: column;
        width: 100%;
      }

      .mes-input,
      .ano-input {
        width: 100%;
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
export class CobrancasComponent implements OnInit {
  cobrancas = signal<CobrancaMensalResponseDTO[]>([]);
  modalBaixaVisivel = signal(false);
  _modalBaixaVisivel = false;
  carregando = signal(false);
  salvando = signal(false);
  gerando = signal(false);
  cobrancaSelecionada = signal<CobrancaMensalResponseDTO | null>(null);

  mesGerar: number = new Date().getMonth() + 1;
  anoGerar: number = new Date().getFullYear();

  baixaData: CobrancaMensalUpdateRequestDTO = {
    status: 'PAGO',
    dataPagamento: undefined,
    recebedor: undefined,
    tipoPagamento: undefined
  };

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

  constructor(
    private cobrancaService: CobrancaService,
    private assinaturaService: AssinaturaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarCobrancas();
  }

  carregarCobrancas(): void {
    this.carregando.set(true);
    this.assinaturaService.listar().subscribe({
      next: (assinaturas) => {
        const requests = assinaturas.map(assinatura =>
          this.cobrancaService.listarPorAssinatura(assinatura.id)
        );
        
        forkJoin(requests).subscribe({
          next: (arraysCobrancas) => {
            const todasCobrancas: CobrancaMensalResponseDTO[] = [];
            arraysCobrancas.forEach(cobrancas => {
              todasCobrancas.push(...cobrancas);
            });
            this.cobrancas.set(todasCobrancas);
            this.carregando.set(false);
          },
          error: (error) => {
            console.error('Erro ao carregar cobranças:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: 'Erro ao carregar cobranças'
            });
            this.carregando.set(false);
          }
        });
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
  }

  gerarMensalidades(): void {
    if (!this.mesGerar || !this.anoGerar) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Informe o mês e ano para gerar as mensalidades'
      });
      return;
    }

    this.gerando.set(true);

    const request: GerarCobrancasRequestDTO = {
      mes: this.mesGerar,
      ano: this.anoGerar
    };

    this.cobrancaService.gerarMensalidades(request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Mensalidades geradas com sucesso'
        });
        this.gerando.set(false);
        setTimeout(() => this.carregarCobrancas(), 500);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao gerar mensalidades'
        });
        this.gerando.set(false);
      }
    });
  }

  abrirModalBaixa(cobranca: CobrancaMensalResponseDTO): void {
    this.cobrancaSelecionada.set(cobranca);
    this.baixaData = {
      status: 'PAGO',
      dataPagamento: undefined,
      recebedor: undefined,
      tipoPagamento: undefined
    };
    this.modalBaixaVisivel.set(true);
    this._modalBaixaVisivel = true;
  }

  fecharModalBaixa(): void {
    this.modalBaixaVisivel.set(false);
    this._modalBaixaVisivel = false;
    this.cobrancaSelecionada.set(null);
  }

  confirmarBaixa(): void {
    const cobranca = this.cobrancaSelecionada();
    if (!cobranca) return;

    if (!this.baixaData.dataPagamento || !this.baixaData.recebedor || !this.baixaData.tipoPagamento) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);

    const updateData: CobrancaMensalUpdateRequestDTO = {
      status: 'PAGO',
      dataPagamento: typeof this.baixaData.dataPagamento === 'string' 
        ? this.baixaData.dataPagamento 
        : (this.baixaData.dataPagamento as Date).toISOString().split('T')[0],
      recebedor: this.baixaData.recebedor,
      tipoPagamento: this.baixaData.tipoPagamento
    };

    this.cobrancaService.atualizar(cobranca.id, updateData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Baixa realizada com sucesso'
        });
        this.fecharModalBaixa();
        this.carregarCobrancas();
        this.salvando.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao dar baixa na cobrança'
        });
        this.salvando.set(false);
      }
    });
  }
}

