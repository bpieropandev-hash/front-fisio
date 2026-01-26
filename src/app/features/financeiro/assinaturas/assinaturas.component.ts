import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { AssinaturaResponseDTO, AssinaturaCreateRequestDTO } from '../../../core/interfaces/assinatura.interface';
import { PacienteResponseDTO } from '../../../core/interfaces/paciente.interface';
import { ServicoResponseDTO } from '../../../core/interfaces/servico.interface';
import { ErrorHandlerUtil } from '../../../core/utils/error-handler.util';
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
  modalVisivel = signal(false);
  _modalVisivel = false;
  carregando = signal(false);
  salvando = signal(false);

  assinaturasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const assinaturasLista = this.assinaturas();
    
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
    valorMensal: 0,
    diaVencimento: 5,
    dataInicio: undefined
  };

  constructor(
    private assinaturaService: AssinaturaService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

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
      valorMensal: 0,
      diaVencimento: 5,
      dataInicio: undefined
    };
    this.modalVisivel.set(true);
    this._modalVisivel = true;
  }

  fecharModal(): void {
    this.modalVisivel.set(false);
    this._modalVisivel = false;
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
      dataInicio: this.novaAssinatura.dataInicio || new Date().toISOString().split('T')[0]
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
}

