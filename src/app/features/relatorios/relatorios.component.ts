import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { RelatorioService } from '../../core/services/relatorio.service';
import { ServicoService } from '../../core/services/servico.service';
import { ServicoResponseDTO } from '../../core/interfaces/servico.interface';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    MultiSelectModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="relatorios-header">
      <h2>Relatórios</h2>
      <p class="subtitle">Gere relatórios financeiros em PDF</p>
    </div>

    <p-card class="relatorio-card">
      <ng-template pTemplate="header">
        <div class="card-header">
          <h3>
            <i class="pi pi-file-pdf"></i>
            Relatório de Acerto Financeiro
          </h3>
        </div>
      </ng-template>

      <form (ngSubmit)="gerarRelatorio()" class="relatorio-form">
        <div class="form-row">
          <div class="form-group">
            <label for="dataInicio">Data Início *</label>
            <p-datepicker
              id="dataInicio"
              [(ngModel)]="filtros.dataInicio"
              name="dataInicio"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              styleClass="full-width"
              placeholder="Selecione a data inicial"
            />
            @if (!filtros.dataInicio && formSubmetido) {
              <small class="error-text">Data início é obrigatória</small>
            }
          </div>

          <div class="form-group">
            <label for="dataFim">Data Fim *</label>
            <p-datepicker
              id="dataFim"
              [(ngModel)]="filtros.dataFim"
              name="dataFim"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              styleClass="full-width"
              placeholder="Selecione a data final"
            />
            @if (!filtros.dataFim && formSubmetido) {
              <small class="error-text">Data fim é obrigatória</small>
            }
          </div>
        </div>

        <div class="form-group">
          <label for="servicos">Serviços *</label>
          <p-multiSelect
            id="servicos"
            [(ngModel)]="filtros.servicoIds"
            name="servicos"
            [options]="servicos()"
            optionLabel="nome"
            optionValue="id"
            placeholder="Selecione os serviços"
            styleClass="full-width"
            [appendTo]="'body'"
            [showClear]="true"
          />
          @if ((!filtros.servicoIds || filtros.servicoIds.length === 0) && formSubmetido) {
            <small class="error-text">Selecione pelo menos um serviço</small>
          }
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            label="Gerar PDF"
            icon="pi pi-file-pdf"
            [loading]="gerando()"
            [disabled]="gerando()"
          />
        </div>
      </form>
    </p-card>
  `,
  styles: [`
    .relatorios-header {
      margin-bottom: 2rem;
    }

    .relatorios-header h2 {
      margin: 0 0 0.5rem 0;
      color: #1e293b;
      font-size: 2rem;
      font-weight: 600;
    }

    .relatorios-header .subtitle {
      margin: 0;
      color: #64748b;
      font-size: 1rem;
    }

    .relatorio-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .card-header {
      padding: 1.5rem;
    }

    .card-header h3 {
      margin: 0;
      color: #1e293b;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-header i {
      color: #ef4444;
    }

    .relatorio-form {
      padding: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1.5rem;
    }

    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #1e293b;
      font-size: 0.875rem;
    }

    .full-width {
      width: 100%;
    }

    .error-text {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RelatoriosComponent implements OnInit {
  servicos = signal<ServicoResponseDTO[]>([]);
  gerando = signal(false);
  formSubmetido = false;

  filtros = {
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    servicoIds: [] as number[]
  };

  constructor(
    private relatorioService: RelatorioService,
    private servicoService: ServicoService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarServicos();
  }

  carregarServicos(): void {
    this.servicoService.listar().subscribe({
      next: (servicos) => {
        this.servicos.set(servicos.filter(s => s.ativo !== false));
      },
      error: (error) => {
        console.error('Erro ao carregar serviços:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar serviços'
        });
      }
    });
  }

  gerarRelatorio(): void {
    this.formSubmetido = true;

    // Validações
    if (!this.filtros.dataInicio || !this.filtros.dataFim) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha as datas de início e fim'
      });
      return;
    }

    if (!this.filtros.servicoIds || this.filtros.servicoIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Selecione pelo menos um serviço'
      });
      return;
    }

    if (this.filtros.dataInicio > this.filtros.dataFim) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'A data de início deve ser anterior à data de fim'
      });
      return;
    }

    this.gerando.set(true);

    // Formatar datas no formato esperado pelo backend: yyyy-MM-dd HH:mm:ss.SSS
    const dataInicioISO = this.formatarDataParaBackend(this.filtros.dataInicio);
    const dataFimISO = this.formatarDataParaBackend(this.filtros.dataFim, true);

    const params = {
      inicio: dataInicioISO,
      fim: dataFimISO,
      servicoIds: this.filtros.servicoIds
    };

    this.relatorioService.baixarRelatorioAcerto(params).subscribe({
      next: (blob) => {
        // Criar link temporário para download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Nome do arquivo com data/hora
        const agora = new Date();
        const nomeArquivo = `relatorio-acerto-financeiro-${agora.getTime()}.pdf`;
        link.download = nomeArquivo;
        
        // Trigger do download
        document.body.appendChild(link);
        link.click();
        
        // Limpar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Relatório gerado e baixado com sucesso'
        });

        this.gerando.set(false);
      },
      error: (error) => {
        console.error('Erro ao gerar relatório:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao gerar relatório'
        });
        this.gerando.set(false);
      }
    });
  }

  private formatarDataParaBackend(data: Date, fimDoDia: boolean = false): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    
    if (fimDoDia) {
      return `${ano}-${mes}-${dia} 23:59:59.999`;
    } else {
      return `${ano}-${mes}-${dia} 00:00:00.000`;
    }
  }
}

