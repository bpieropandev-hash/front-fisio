import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
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
        TooltipModule,
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

    <div class="search-container">
      <div class="search-wrapper">
        <input
          type="text"
          pInputText
          placeholder="Pesquisar por descrição, mês/ano, valor, status..."
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
      @if (termoPesquisa() && cobrancasFiltradas().length > 0) {
        <div class="search-results-info">
          <i class="pi pi-info-circle"></i>
          <span>{{ cobrancasFiltradas().length }} cobrança(s) encontrada(s)</span>
        </div>
      }
      @if (termoPesquisa() && cobrancasFiltradas().length === 0) {
        <div class="search-no-results">
          <i class="pi pi-search"></i>
          <span>Nenhuma cobrança encontrada com o termo "{{ termoPesquisa() }}"</span>
        </div>
      }
    </div>

    <p-table
      [value]="cobrancasFiltradas()"
      [paginator]="true"
      [rows]="10"
      [loading]="carregando()"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
      <ng-template pTemplate="header">
        <tr>
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
          [appendTo]="'body'"
          [showIcon]="true"
          [showButtonBar]="true"
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
  termoPesquisa = signal<string>('');
  modalBaixaVisivel = signal(false);
  _modalBaixaVisivel = false;
  carregando = signal(false);
  salvando = signal(false);
  gerando = signal(false);
  cobrancaSelecionada = signal<CobrancaMensalResponseDTO | null>(null);

  cobrancasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const cobrancasLista = this.cobrancas();
    
    if (!termo) {
      return cobrancasLista;
    }

    return cobrancasLista.filter(cobranca => {
      const descricao = cobranca.descricao?.toLowerCase() || '';
      const mesReferencia = cobranca.mesReferencia?.toString() || '';
      const anoReferencia = cobranca.anoReferencia?.toString() || '';
      const valor = cobranca.valor?.toString() || '';
      const status = cobranca.status === 'PAGO' ? 'pago' : 'pendente';
      const recebedor = cobranca.recebedor?.toLowerCase() || '';
      const tipoPagamento = cobranca.tipoPagamento?.toLowerCase() || '';
      
      return descricao.includes(termo) || 
             mesReferencia.includes(termo) ||
             anoReferencia.includes(termo) ||
             valor.includes(termo) ||
             status.includes(termo) ||
             recebedor.includes(termo) ||
             tipoPagamento.includes(termo);
    });
  });

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
            // Ordenar cobranças por descrição (ASC)
            const cobrancasOrdenadas = todasCobrancas.sort((a, b) => {
              const descricaoA = a.descricao?.toLowerCase() || '';
              const descricaoB = b.descricao?.toLowerCase() || '';
              return descricaoA.localeCompare(descricaoB, 'pt-BR');
            });
            this.cobrancas.set(cobrancasOrdenadas);
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

  limparPesquisa(): void {
    this.termoPesquisa.set('');
  }
}

