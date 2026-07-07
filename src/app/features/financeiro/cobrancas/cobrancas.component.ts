import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { HttpErrorResponse } from '@angular/common/http';
import { CobrancaService } from '../../../core/services/cobranca.service';
import {
  CobrancaMensalResponseDTO,
  CobrancaMensalUpdateRequestDTO,
  GerarCobrancasRequestDTO
} from '../../../core/interfaces/cobranca.interface';
import { formatDateForApi } from '../../../core/utils/date-format.util';
import { ErrorHandlerUtil } from '../../../core/utils/error-handler.util';

@Component({
    selector: 'app-cobrancas',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        DatePickerModule,
        SelectModule,
        TagModule,
        TooltipModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './cobrancas.component.html',
    styleUrls: ['./cobrancas.component.scss']
})
export class CobrancasComponent implements OnInit {
  cobrancas = signal<CobrancaMensalResponseDTO[]>([]);
  termoPesquisa = signal<string>('');
  modalBaixaVisivel = false;
  carregando = signal(false);
  salvando = signal(false);
  gerando = signal(false);
  cobrancaSelecionada = signal<CobrancaMensalResponseDTO | null>(null);

  filtroStatus = signal<'todos' | 'pago' | 'pendente'>('todos');

  filtroStatusOptions = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pago', value: 'pago' },
    { label: 'Pendente', value: 'pendente' }
  ];

  cobrancasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const filtroStatus = this.filtroStatus();
    let cobrancasLista = this.cobrancas();

    if (filtroStatus === 'pago') {
      cobrancasLista = cobrancasLista.filter(c => c.status === 'PAGO');
    } else if (filtroStatus === 'pendente') {
      cobrancasLista = cobrancasLista.filter(c => c.status !== 'PAGO');
    }

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

  mesAnoGerar: Date = new Date();

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

  obterLabelRecebedor(valor: string | undefined): string {
    return this.recebedorOptions.find(o => o.value === valor)?.label ?? valor ?? '-';
  }

  obterLabelTipoPagamento(valor: string | undefined): string {
    return this.tipoPagamentoOptions.find(o => o.value === valor)?.label ?? valor ?? '-';
  }

  /** null = todos os meses. Default: mês atual (reduz payload no caso comum). */
  filtroMesAno = signal<Date | null>(new Date());

  constructor(
    private cobrancaService: CobrancaService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const params = this.route.snapshot.queryParamMap;
    const mesParam = params.get('mes');
    const anoParam = params.get('ano');
    if (mesParam === 'todos') {
      this.filtroMesAno.set(null);
    } else if (mesParam && anoParam) {
      this.filtroMesAno.set(new Date(Number(anoParam), Number(mesParam) - 1, 1));
    }
    const statusParam = params.get('status');
    if (statusParam === 'pago' || statusParam === 'pendente') {
      this.filtroStatus.set(statusParam);
    }
  }

  ngOnInit(): void {
    this.carregarCobrancas();
  }

  aoMudarFiltroMesAno(valor: Date | null): void {
    this.filtroMesAno.set(valor);
    this.atualizarQueryParams();
    this.carregarCobrancas();
  }

  aoMudarFiltroStatus(valor: 'todos' | 'pago' | 'pendente'): void {
    this.filtroStatus.set(valor);
    this.atualizarQueryParams();
  }

  private atualizarQueryParams(): void {
    const mesAno = this.filtroMesAno();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mes: mesAno ? mesAno.getMonth() + 1 : 'todos',
        ano: mesAno ? mesAno.getFullYear() : null,
        status: this.filtroStatus() === 'todos' ? null : this.filtroStatus()
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  carregarCobrancas(): void {
    this.carregando.set(true);
    const mesAno = this.filtroMesAno();
    const mes = mesAno ? mesAno.getMonth() + 1 : undefined;
    const ano = mesAno ? mesAno.getFullYear() : undefined;

    this.cobrancaService.listar(mes, ano).subscribe({
      next: (cobrancas) => {
        const cobrancasOrdenadas = cobrancas.sort((a, b) => {
          const descricaoA = a.descricao?.toLowerCase() || '';
          const descricaoB = b.descricao?.toLowerCase() || '';
          return descricaoA.localeCompare(descricaoB, 'pt-BR');
        });
        this.cobrancas.set(cobrancasOrdenadas);
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

  gerarMensalidades(): void {
    if (!this.mesAnoGerar) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Informe o mês e ano para gerar as mensalidades'
      });
      return;
    }

    this.gerando.set(true);

    const request: GerarCobrancasRequestDTO = {
      mes: this.mesAnoGerar.getMonth() + 1,
      ano: this.mesAnoGerar.getFullYear()
    };

    this.cobrancaService.gerarMensalidades(request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Mensalidades geradas com sucesso'
        });
        this.gerando.set(false);
        this.carregarCobrancas();
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
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
    this.modalBaixaVisivel = true;
  }

  fecharModalBaixa(): void {
    this.modalBaixaVisivel = false;
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

    const dataPagamento = this.baixaData.dataPagamento;
    const dataPagamentoStr = typeof dataPagamento === 'string'
      ? dataPagamento
      : dataPagamento ? formatDateForApi(dataPagamento as Date) : undefined;

    const updateData: CobrancaMensalUpdateRequestDTO = {
      status: 'PAGO',
      dataPagamento: dataPagamentoStr,
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
