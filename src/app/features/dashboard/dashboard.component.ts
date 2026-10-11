import { Component, OnInit, signal, computed, inject } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardResumoDTO, AlertaPendenciaDTO } from '../../core/interfaces/dashboard.interface';
import { formatDateForApi, formatDateTimeForApi } from '../../core/utils/date-format.util';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { AgendamentoService } from '../../core/services/agendamento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ServicoService } from '../../core/services/servico.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { obterPillStatus } from '../../core/utils/status-pill.util';

export interface ProximoAtendimentoUI {
  hora: string;
  pacienteNome: string;
  servicoNome: string;
  status: string;
}

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
  private readonly breakpointService = inject(BreakpointService);
  isMobile = this.breakpointService.isMobile;
  isTablet = this.breakpointService.isTablet;

  carregando = signal(true);
  resumo = signal<DashboardResumoDTO | null>(null);
  filtrosVisiveis = signal(false);
  periodoLabel = signal('Mês atual');

  // --- Shell mobile (spec 10) ---
  nomeUsuario = signal<string | null>(null);
  carregandoProximos = signal(true);
  proximosAtendimentos = signal<ProximoAtendimentoUI[]>([]);
  saudacaoData = computed(() => {
    const hoje = new Date();
    const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(hoje);
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
  obterPillStatus = obterPillStatus;

  filtros = {
    dataInicio: null as Date | null,
    dataFim: null as Date | null
  };

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private messageService: MessageService,
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
    this.carregarProximosAtendimentos();
    this.usuarioService.buscarMe().subscribe({
      next: (usuario) => this.nomeUsuario.set(usuario.nome?.split(' ')[0] || null),
      error: () => {
        // Sessão inválida - interceptor/guard já cuidam do redirect
      }
    });
  }

  /** Atendimentos de hoje, ordenados por horário — para o card "Próximos atendimentos" do shell mobile */
  carregarProximosAtendimentos(): void {
    this.carregandoProximos.set(true);
    const hoje = new Date();
    const inicioDia = new Date(hoje);
    inicioDia.setHours(0, 0, 0, 0);

    forkJoin({
      atendimentos: this.agendamentoService.listar({
        dataInicio: formatDateTimeForApi(inicioDia),
        dataFim: formatDateTimeForApi(hoje, true)
      }),
      pacientes: this.pacienteService.listar(),
      servicos: this.servicoService.listar()
    }).subscribe({
      next: ({ atendimentos, pacientes, servicos }) => {
        const lista: ProximoAtendimentoUI[] = atendimentos
          .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
          .slice(0, 4)
          .map(a => ({
            hora: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(a.dataHoraInicio)),
            pacienteNome: pacientes.find(p => p.id === a.pacienteId)?.nome || `Paciente #${a.pacienteId}`,
            servicoNome: servicos.find(s => s.id === a.servicoBaseId)?.nome || `Serviço #${a.servicoBaseId}`,
            status: a.status
          }));
        this.proximosAtendimentos.set(lista);
        this.carregandoProximos.set(false);
      },
      error: () => {
        this.proximosAtendimentos.set([]);
        this.carregandoProximos.set(false);
      }
    });
  }

  irParaAgenda(): void {
    this.router.navigate(['/agenda']);
  }

  irParaNovoPaciente(): void {
    this.router.navigate(['/pacientes']);
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
