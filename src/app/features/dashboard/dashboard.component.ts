import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardResumoDTO, AlertaPendenciaDTO } from '../../core/interfaces/dashboard.interface';
import { formatDateForApi } from '../../core/utils/date-format.util';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        TableModule,
        ButtonModule,
        TagModule,
        ProgressSpinnerModule,
        DatePickerModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  carregando = signal(true);
  resumo = signal<DashboardResumoDTO | null>(null);
  filtrosVisiveis = signal(false);
  periodoLabel = signal('Mês atual');
  
  filtros = {
    dataInicio: null as Date | null,
    dataFim: null as Date | null
  };

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  toggleFiltros(): void {
    this.filtrosVisiveis.set(!this.filtrosVisiveis());
  }

  limparFiltros(): void {
    this.filtros = {
      dataInicio: null,
      dataFim: null
    };
    this.carregarDados();
  }

  aplicarFiltros(): void {
    if (this.filtros.dataInicio && this.filtros.dataFim &&
        this.filtros.dataInicio > this.filtros.dataFim) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'A data de início deve ser anterior à data de fim'
      });
      return;
    }

    this.carregarDados();
  }

  carregarDados(): void {
    this.carregando.set(true);

    const inicio = this.filtros.dataInicio ? formatDateForApi(this.filtros.dataInicio) : undefined;
    const fim = this.filtros.dataFim ? formatDateForApi(this.filtros.dataFim) : undefined;
    this.periodoLabel.set(this.montarPeriodoLabel());

    this.dashboardService.buscarResumo(inicio, fim).subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
        this.carregando.set(false);
      }
    });
  }

  private montarPeriodoLabel(): string {
    const { dataInicio, dataFim } = this.filtros;
    if (!dataInicio && !dataFim) return 'Mês atual';
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR');
    if (dataInicio && dataFim) return `${fmt(dataInicio)} a ${fmt(dataFim)}`;
    if (dataInicio) return `A partir de ${fmt(dataInicio)}`;
    return `Até ${fmt(dataFim!)}`;
  }

  resolverAlerta(alerta: AlertaPendenciaDTO): void {
    switch (alerta.tipoPendencia) {
      case 'ATENDIMENTO_AVULSO':
        this.router.navigate(['/agenda']);
        break;
      case 'ASSINATURA':
        this.router.navigate(['/financeiro/cobrancas']);
        break;
      default:
        this.router.navigate(['/financeiro/cobrancas']);
    }
  }

  obterLabelTipoPendencia(tipo: string): string {
    return tipo === 'ATENDIMENTO_AVULSO' ? 'Atendimento avulso' : 'Assinatura';
  }
}
