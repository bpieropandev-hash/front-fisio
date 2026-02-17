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
    // Validação básica
    if (this.filtros.dataInicio && this.filtros.dataFim) {
      if (this.filtros.dataInicio > this.filtros.dataFim) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atenção',
          detail: 'A data de início deve ser anterior à data de fim'
        });
        return;
      }
    }

    // Por enquanto, apenas recarrega os dados
    // Quando o backend suportar filtros por período, passar os parâmetros aqui
    this.carregarDados();
    
    this.messageService.add({
      severity: 'info',
      summary: 'Filtros aplicados',
      detail: 'Os filtros foram aplicados (funcionalidade em desenvolvimento)'
    });
  }

  carregarDados(): void {
    this.carregando.set(true);

    this.dashboardService.buscarResumo().subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.carregando.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar resumo do dashboard:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar dados do dashboard'
        });
        this.carregando.set(false);
      }
    });
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
