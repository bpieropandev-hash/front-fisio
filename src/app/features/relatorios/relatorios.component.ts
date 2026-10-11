import { Component, OnInit, signal, inject } from '@angular/core';

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
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
    selector: 'app-relatorios',
    imports: [
    FormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    MultiSelectModule,
    ToastModule
],
    providers: [MessageService],
    templateUrl: './relatorios.component.html',
    styleUrls: ['./relatorios.component.scss']
})
export class RelatoriosComponent implements OnInit {
  private readonly breakpointService = inject(BreakpointService);
  isTablet = this.breakpointService.isTablet;

  servicos = signal<ServicoResponseDTO[]>([]);
  gerando = signal(false);
  formSubmetido = false;
  periodoPillAtivo = signal<'mes' | '30dias' | 'ano' | null>(null);

  filtros = {
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    servicoIds: [] as number[]
  };

  /** Atalhos de período (spec 10) — só preenchem as datas, sem inventar métricas que o backend não calcula */
  selecionarPeriodo(periodo: 'mes' | '30dias' | 'ano'): void {
    this.periodoPillAtivo.set(periodo);
    const hoje = new Date();
    let inicio: Date;
    if (periodo === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else if (periodo === '30dias') {
      inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 30);
    } else {
      inicio = new Date(hoje.getFullYear(), 0, 1);
    }
    this.filtros.dataInicio = inicio;
    this.filtros.dataFim = hoje;
  }

  selecionarTodosServicos(): void {
    this.filtros.servicoIds = this.servicos().map(s => s.id);
  }

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

