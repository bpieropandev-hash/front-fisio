import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AssinaturaService } from '../../../core/services/assinatura.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ServicoService } from '../../../core/services/servico.service';
import {
  AssinaturaResponseDTO,
  AssinaturaCreateRequestDTO,
  AssinaturaUpdateRequestDTO,
  AssinaturaTrocarPlanoRequestDTO
} from '../../../core/interfaces/assinatura.interface';
import { PacienteResponseDTO } from '../../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../../core/interfaces/servico.interface';
import { ErrorHandlerUtil } from '../../../core/utils/error-handler.util';
import { formatDateForApi } from '../../../core/utils/date-format.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-assinaturas',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        MultiSelectModule,
        TagModule,
        TooltipModule,
        ToastModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './assinaturas.component.html',
    styleUrls: ['./assinaturas.component.scss']
})
export class AssinaturasComponent implements OnInit {
  assinaturas = signal<AssinaturaResponseDTO[]>([]);
  termoPesquisa = signal<string>('');
  pacientes = signal<PacienteResponseDTO[]>([]);
  servicos = signal<ServicoResponseDTO[]>([]);
  modalVisivel = false;
  modalEditarVisivel = false;
  carregando = signal(false);
  salvando = signal(false);

  assinaturaEditando: AssinaturaResponseDTO | null = null;
  edicao: AssinaturaUpdateRequestDTO = { valorMensal: undefined, diaVencimento: undefined };

  modalTrocarPlanoVisivel = false;
  assinaturaTrocandoPlano: AssinaturaResponseDTO | null = null;
  trocaPlano: Partial<AssinaturaTrocarPlanoRequestDTO> = {};

  filtroStatus = signal<'todas' | 'ativas' | 'canceladas'>('todas');
  filtroServicoId = signal<number>(0);

  filtroStatusOptions = [
    { label: 'Todas', value: 'todas' },
    { label: 'Ativas', value: 'ativas' },
    { label: 'Canceladas', value: 'canceladas' }
  ];

  assinaturasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const filtroStatus = this.filtroStatus();
    const filtroServicoId = this.filtroServicoId();
    let assinaturasLista = this.assinaturas();

    if (filtroStatus === 'ativas') {
      assinaturasLista = assinaturasLista.filter(a => a.ativo);
    } else if (filtroStatus === 'canceladas') {
      assinaturasLista = assinaturasLista.filter(a => !a.ativo);
    }

    if (filtroServicoId) {
      assinaturasLista = assinaturasLista.filter(a => a.servicoId === filtroServicoId);
    }

    if (!termo) {
      return assinaturasLista;
    }

    return assinaturasLista.filter(assinatura => {
      const pacienteNome = assinatura.pacienteNome?.toLowerCase() || '';
      const servicoNome = assinatura.servicoNome?.toLowerCase() || '';
      const valorMensal = assinatura.valorMensal?.toString() || '';
      const diaVencimento = assinatura.diaVencimento?.toString() || '';
      
      return pacienteNome.includes(termo) || 
             servicoNome.includes(termo) || 
             valorMensal.includes(termo) ||
             diaVencimento.includes(termo);
    });
  });

  pacienteIdsSelecionados: number[] = [];
  novaAssinatura: Partial<AssinaturaCreateRequestDTO> = {
    servicoId: 0,
    valorMensal: undefined,
    diaVencimento: 5,
    dataInicio: undefined
  };

  constructor(
    private assinaturaService: AssinaturaService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const params = this.route.snapshot.queryParamMap;
    const statusParam = params.get('status');
    if (statusParam === 'ativas' || statusParam === 'canceladas') {
      this.filtroStatus.set(statusParam);
    }
    const servicoParam = params.get('servico');
    if (servicoParam) {
      this.filtroServicoId.set(Number(servicoParam));
    }
  }

  aoMudarFiltroStatus(valor: 'todas' | 'ativas' | 'canceladas'): void {
    this.filtroStatus.set(valor);
    this.atualizarQueryParams();
  }

  aoMudarFiltroServico(valor: number | null): void {
    this.filtroServicoId.set(valor ?? 0);
    this.atualizarQueryParams();
  }

  private atualizarQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.filtroStatus() === 'todas' ? null : this.filtroStatus(),
        servico: this.filtroServicoId() || null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.carregando.set(true);
    this.assinaturaService.listar().subscribe({
      next: (assinaturas) => {
        // Ordenar assinaturas por nome do paciente (ASC)
        const assinaturasOrdenadas = assinaturas.sort((a, b) => {
          const nomeA = a.pacienteNome?.toLowerCase() || '';
          const nomeB = b.pacienteNome?.toLowerCase() || '';
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });
        this.assinaturas.set(assinaturasOrdenadas);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar assinaturas:', error);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
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
    this.pacienteIdsSelecionados = [];
    this.novaAssinatura = {
      servicoId: 0,
      valorMensal: undefined,
      diaVencimento: 5,
      dataInicio: undefined
    };
    this.modalVisivel = true;
  }

  fecharModal(): void {
    this.modalVisivel = false;
  }

  criarAssinatura(): void {
    if (!this.pacienteIdsSelecionados || this.pacienteIdsSelecionados.length === 0 || !this.novaAssinatura.servicoId || !this.novaAssinatura.valorMensal || !this.novaAssinatura.diaVencimento) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);

    const data: AssinaturaCreateRequestDTO = {
      pacienteIds: this.pacienteIdsSelecionados,
      servicoId: this.novaAssinatura.servicoId!,
      valorMensal: this.novaAssinatura.valorMensal!,
      diaVencimento: this.novaAssinatura.diaVencimento!,
      dataInicio: this.novaAssinatura.dataInicio || formatDateForApi(new Date())
    };

    this.assinaturaService.criar(data).subscribe({
      next: (assinaturasCriadas) => {
        const quantidade = assinaturasCriadas.length;
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: quantidade === 1 
            ? 'Assinatura criada com sucesso' 
            : `${quantidade} assinaturas criadas com sucesso`
        });
        this.fecharModal();
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        // Mensagem específica para conflito (assinatura já existe)
        if (error.status === 409 || error.status === 400) {
          errorMessage.detail = errorMessage.detail || 'Erro ao criar assinatura(s). Verifique se os pacientes estão ativos e não possuem assinatura ativa para este serviço.';
        }
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
        this.salvando.set(false);
      }
    });
  }

  confirmarCancelamento(assinatura: AssinaturaResponseDTO): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja cancelar o plano de ${assinatura.pacienteNome}?`,
      header: 'Confirmar Cancelamento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, cancelar',
      rejectLabel: 'Não',
      accept: () => {
        this.cancelarAssinatura(assinatura.id);
      }
    });
  }

  cancelarAssinatura(id: number): void {
    this.salvando.set(true);
    this.assinaturaService.cancelar(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Assinatura cancelada com sucesso'
        });
        this.carregarDados();
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

  abrirModalEditar(assinatura: AssinaturaResponseDTO): void {
    this.assinaturaEditando = assinatura;
    this.edicao = {
      valorMensal: assinatura.valorMensal,
      diaVencimento: assinatura.diaVencimento
    };
    this.modalEditarVisivel = true;
  }

  fecharModalEditar(): void {
    this.modalEditarVisivel = false;
    this.assinaturaEditando = null;
  }

  salvarEdicao(): void {
    if (!this.assinaturaEditando || !this.edicao.valorMensal || !this.edicao.diaVencimento) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);
    this.assinaturaService.atualizar(this.assinaturaEditando.id, this.edicao).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Assinatura atualizada com sucesso'
        });
        this.fecharModalEditar();
        this.carregarDados();
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

  confirmarReativacao(assinatura: AssinaturaResponseDTO): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja reativar o plano de ${assinatura.pacienteNome}?`,
      header: 'Confirmar Reativação',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sim, reativar',
      rejectLabel: 'Não',
      accept: () => {
        this.reativarAssinatura(assinatura.id);
      }
    });
  }

  abrirModalTrocarPlano(assinatura: AssinaturaResponseDTO): void {
    this.assinaturaTrocandoPlano = assinatura;
    this.trocaPlano = {
      novoServicoId: undefined,
      novoValorMensal: undefined,
      diaVencimento: assinatura.diaVencimento,
      dataInicio: undefined
    };
    this.modalTrocarPlanoVisivel = true;
  }

  fecharModalTrocarPlano(): void {
    this.modalTrocarPlanoVisivel = false;
    this.assinaturaTrocandoPlano = null;
  }

  aoSelecionarNovoServico(): void {
    const servico = this.servicos().find(s => s.id === this.trocaPlano.novoServicoId);
    if (servico) {
      this.trocaPlano.novoValorMensal = servico.valorBase;
    }
  }

  confirmarTrocarPlano(): void {
    if (!this.assinaturaTrocandoPlano || !this.trocaPlano.novoServicoId || !this.trocaPlano.novoValorMensal || !this.trocaPlano.diaVencimento) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);

    const data: AssinaturaTrocarPlanoRequestDTO = {
      novoServicoId: this.trocaPlano.novoServicoId,
      novoValorMensal: this.trocaPlano.novoValorMensal,
      diaVencimento: this.trocaPlano.diaVencimento,
      dataInicio: this.trocaPlano.dataInicio || formatDateForApi(new Date())
    };

    this.assinaturaService.trocarPlano(this.assinaturaTrocandoPlano.id, data).subscribe({
      next: (resultado) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Plano trocado',
          detail: resultado.cobrancaMesAtualMantida
            ? 'Nova assinatura criada. A cobrança já gerada neste mês para o plano antigo foi mantida.'
            : 'Nova assinatura criada com sucesso.'
        });
        this.fecharModalTrocarPlano();
        this.carregarDados();
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

  reativarAssinatura(id: number): void {
    this.salvando.set(true);
    this.assinaturaService.reativar(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Assinatura reativada com sucesso'
        });
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        if (error.status === 400) {
          errorMessage.detail = errorMessage.detail || 'Já existe uma assinatura ativa para este paciente e serviço.';
        }
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

