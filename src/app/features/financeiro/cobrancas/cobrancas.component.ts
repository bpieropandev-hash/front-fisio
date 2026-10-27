import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
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
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { ReciboDialogComponent } from '../../../shared/components/recibo-dialog/recibo-dialog.component';
import { OrigemRecibo } from '../../../core/interfaces/recibo.interface';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { BreakpointService } from '../../../core/services/breakpoint.service';

@Component({
    selector: 'app-cobrancas',
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        RouterLinkActive,
        TableModule,
        ButtonModule,
        DialogModule,
        DatePickerModule,
        SelectModule,
        TagModule,
        TooltipModule,
        ToastModule,
        SearchInputComponent, ReciboDialogComponent, PageStateComponent
    ],
    providers: [MessageService],
    templateUrl: './cobrancas.component.html',
    styleUrls: ['./cobrancas.component.scss']
})
export class CobrancasComponent implements OnInit {
  private readonly breakpointService = inject(BreakpointService);
  isMobile = this.breakpointService.isMobile;
  isTablet = this.breakpointService.isTablet;

  modalEstornoVisivel = false;
  motivoEstorno = '';
  estornando = signal(false);
  erroEstorno = signal('');
  cobrancaEstorno: CobrancaMensalResponseDTO | null = null;
  filtroPacienteId = signal<number | null>(null);
  erroCarregamento = signal('');
  private consultaAtual = 0;
  pacientesOptions = computed(() => {
    const pacientes = new Map<number, string>();
    for (const c of this.cobrancas()) if (c.pacienteId) pacientes.set(c.pacienteId, c.pacienteNome || c.descricao);
    return [...pacientes].map(([value, label]) => ({value, label})).sort((a,b)=>a.label.localeCompare(b.label, 'pt-BR'));
  });

  abrirModalEstorno(cobranca: CobrancaMensalResponseDTO): void {
    if (this.estornando() || cobranca.status !== 'PAGO') return;
    this.cobrancaEstorno = cobranca;
    this.motivoEstorno = '';
    this.erroEstorno.set('');
    this.modalEstornoVisivel = true;
  }
  fecharModalEstorno(): void {
    if (this.estornando()) return;
    this.modalEstornoVisivel = false;
    this.cobrancaEstorno = null;
  }
  confirmarEstorno(): void {
    if (this.estornando() || !this.cobrancaEstorno) return;
    const motivo = this.motivoEstorno.trim();
    if (!motivo || motivo.length > 1000) {
      this.erroEstorno.set('Informe o motivo do estorno (até 1000 caracteres).');
      return;
    }
    this.estornando.set(true);
    this.erroEstorno.set('');
    this.cobrancaService.estornar(this.cobrancaEstorno.id, motivo).subscribe({
      next: (atualizada) => {
        this.cobrancas.update(lista => lista.map(c => c.id === atualizada.id ? atualizada : c));
        this.estornando.set(false);
        this.fecharModalEstorno();
        this.messageService.add({severity:'success', summary:'Estorno concluído', detail:'A cobrança voltou a ficar pendente.'});
      },
      error: (erro: HttpErrorResponse) => {
        this.erroEstorno.set(ErrorHandlerUtil.getErrorMessage(erro).detail);
        this.estornando.set(false);
      }
    });
  }
  aoMudarFiltroPaciente(id: number | null): void {
    this.filtroPacienteId.set(id);
    this.atualizarQueryParams();
  }

  cobrancas = signal<CobrancaMensalResponseDTO[]>([]);
  termoPesquisa = signal<string>('');
  reciboVisivel = false;
  reciboOrigem: OrigemRecibo | null = null;
  cobrancaRecibo: CobrancaMensalResponseDTO | null = null;
  abrirRecibo(cobranca: CobrancaMensalResponseDTO): void {
    if(cobranca.status !== 'PAGO' || cobranca.valor <= 0)return;
    this.cobrancaRecibo=cobranca;this.reciboOrigem={cobrancaId:cobranca.id};this.reciboVisivel=true;
  }
  modalBaixaVisivel = false;
  carregando = signal(false);
  salvando = signal(false);
  gerando = signal(false);
  cobrancaSelecionada = signal<CobrancaMensalResponseDTO | null>(null);

  filtroStatus = signal<'todos' | 'pago' | 'pendente'>('todos');

  filtroStatusOptions: { label: string; value: 'todos' | 'pago' | 'pendente' }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pago', value: 'pago' },
    { label: 'Pendente', value: 'pendente' }
  ];

  // --- Shell mobile (spec 10) ---
  totalRecebidoMes = computed(() => this.cobrancas().filter(c => c.status === 'PAGO').reduce((soma, c) => soma + c.valor, 0));
  totalPendenteMes = computed(() => this.cobrancas().filter(c => c.status === 'PENDENTE').reduce((soma, c) => soma + c.valor, 0));

  rotuloMesAno = computed(() => {
    const d = this.filtroMesAno();
    if (!d) return 'Todos os meses';
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  mesAnoAnterior(): void {
    const base = this.filtroMesAno() ?? new Date();
    this.aoMudarFiltroMesAno(new Date(base.getFullYear(), base.getMonth() - 1, 1));
  }

  mesAnoProximo(): void {
    const base = this.filtroMesAno() ?? new Date();
    this.aoMudarFiltroMesAno(new Date(base.getFullYear(), base.getMonth() + 1, 1));
  }

  gerarMesAtualMobile(): void {
    this.mesAnoGerar = this.filtroMesAno() ?? new Date();
    this.gerarMensalidades();
  }

  cobrancasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const filtroStatus = this.filtroStatus();
    let cobrancasLista = this.cobrancas();
    const pacienteId = this.filtroPacienteId();
    if (pacienteId) cobrancasLista = cobrancasLista.filter(c => c.pacienteId === pacienteId);

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
    const pacienteParam = Number(params.get('paciente'));
    if (Number.isInteger(pacienteParam) && pacienteParam > 0) this.filtroPacienteId.set(pacienteParam);
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
        status: this.filtroStatus() === 'todos' ? null : this.filtroStatus(),
        paciente: this.filtroPacienteId()
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  carregarCobrancas(): void {
    this.carregando.set(true);
    this.erroCarregamento.set('');
    const consulta = ++this.consultaAtual;
    const mesAno = this.filtroMesAno();
    const mes = mesAno ? mesAno.getMonth() + 1 : undefined;
    const ano = mesAno ? mesAno.getFullYear() : undefined;

    this.cobrancaService.listar(mes, ano).subscribe({
      next: (cobrancas) => {
        if (consulta !== this.consultaAtual) return;
        const cobrancasOrdenadas = cobrancas.sort((a, b) => {
          const descricaoA = a.descricao?.toLowerCase() || '';
          const descricaoB = b.descricao?.toLowerCase() || '';
          return descricaoA.localeCompare(descricaoB, 'pt-BR');
        });
        this.cobrancas.set(cobrancasOrdenadas);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (consulta !== this.consultaAtual) return;
        this.erroCarregamento.set(ErrorHandlerUtil.getErrorMessage(error).detail);
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
    if (!cobranca || this.salvando()) return;

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

}
