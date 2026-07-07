import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { RadioButton } from 'primeng/radiobutton';
import { Checkbox } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ServicoService } from '../../core/services/servico.service';
import { ServicoCreateRequestDTO, ServicoResponseDTO } from '../../core/interfaces/servico.interface';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';

/** Form da tela: valor base começa nulo (nunca 0 — evita o "0,00" chato ao digitar). */
type ServicoForm = Omit<ServicoCreateRequestDTO, 'valorBase'> & { valorBase: number | null };

@Component({
  selector: 'app-servicos',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    Dialog,
    Button,
    InputText,
    InputNumber,
    ToggleSwitch,
    Select,
    Tag,
    Toast,
    ConfirmDialog,
    RadioButton,
    Checkbox
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './servicos.component.html',
  styleUrls: ['./servicos.component.scss']
})
export class ServicosComponent implements OnInit {
  servicos = signal<ServicoResponseDTO[]>([]);
  carregando = signal(false);
  salvando = signal(false);

  modalVisivel = false;
  servicoEmEdicao: ServicoResponseDTO | null = null;

  formServico: ServicoForm = this.formPadrao();

  assinaturasAtivasCount = signal(0);
  reajusteDialogVisivel = false;
  reajusteOpcao: 'catalogo' | 'ativas' | 'ativasCobrancas' = 'ativas';
  preservarNegociados = true;
  private payloadPendente: ServicoCreateRequestDTO | null = null;

  tipoServicoOptions = [
    { label: 'Fisioterapia', value: 'FISIOTERAPIA' },
    { label: 'Pilates', value: 'PILATES' }
  ];

  constructor(
    private servicoService: ServicoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.carregarServicos();
  }

  private formPadrao(): ServicoForm {
    return {
      nome: '',
      tipo: 'FISIOTERAPIA',
      valorBase: null,
      pctClinica: 20,
      pctProfissional: 80,
      ativo: true
    };
  }

  carregarServicos(): void {
    this.carregando.set(true);
    this.servicoService.listar().subscribe({
      next: (servicos) => {
        this.servicos.set(servicos);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não conseguimos carregar os serviços.'
        });
      }
    });
  }

  abrirModalNovo(): void {
    this.servicoEmEdicao = null;
    this.formServico = this.formPadrao();
    this.modalVisivel = true;
  }

  editarServico(servico: ServicoResponseDTO): void {
    this.servicoEmEdicao = servico;
    this.formServico = {
      nome: servico.nome,
      tipo: servico.tipo,
      valorBase: servico.valorBase,
      pctClinica: servico.pctClinica,
      pctProfissional: servico.pctProfissional,
      ativo: servico.ativo ?? true
    };
    this.assinaturasAtivasCount.set(0);
    this.servicoService.contarAssinaturasAtivas(servico.id).subscribe({
      next: (count) => this.assinaturasAtivasCount.set(count),
      error: () => this.assinaturasAtivasCount.set(0)
    });
    this.modalVisivel = true;
  }

  salvarServico(): void {
    if (!this.formServico.nome || !this.formServico.tipo || !this.formServico.valorBase) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos obrigatórios',
        detail: 'Preencha nome, tipo e valor base.'
      });
      return;
    }

    if ((this.formServico.pctClinica ?? 0) + (this.formServico.pctProfissional ?? 0) !== 100) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Repasse inválido',
        detail: 'A soma de % Clínica e % Profissional precisa ser exatamente 100%.'
      });
      return;
    }

    const payload: ServicoCreateRequestDTO = {
      ...this.formServico,
      valorBase: this.formServico.valorBase
    };

    const valorMudou = this.servicoEmEdicao != null && this.servicoEmEdicao.valorBase !== payload.valorBase;

    if (this.servicoEmEdicao && valorMudou && this.assinaturasAtivasCount() > 0) {
      this.payloadPendente = payload;
      this.reajusteOpcao = 'ativas';
      this.preservarNegociados = true;
      this.reajusteDialogVisivel = true;
      return;
    }

    this.executarSalvar(payload);
  }

  private executarSalvar(payload: ServicoCreateRequestDTO): void {
    this.salvando.set(true);

    const request$ = this.servicoEmEdicao
      ? this.servicoService.atualizar(this.servicoEmEdicao.id, payload)
      : this.servicoService.criar(payload);

    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Tudo certo!',
          detail: `Serviço ${this.servicoEmEdicao ? 'atualizado' : 'criado'} com sucesso.`
        });
        this.salvando.set(false);
        this.modalVisivel = false;
        this.carregarServicos();
      },
      error: (error: HttpErrorResponse) => {
        this.salvando.set(false);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }

  fecharReajusteDialog(): void {
    this.reajusteDialogVisivel = false;
    this.payloadPendente = null;
  }

  confirmarReajuste(): void {
    if (!this.servicoEmEdicao || !this.payloadPendente) {
      return;
    }

    const id = this.servicoEmEdicao.id;
    const payload = this.payloadPendente;
    this.reajusteDialogVisivel = false;
    this.salvando.set(true);

    this.servicoService.atualizar(id, payload).pipe(
      switchMap(() => {
        if (this.reajusteOpcao === 'catalogo') {
          return [null];
        }
        return this.servicoService.reajustar(id, {
          novoValorBase: payload.valorBase,
          aplicarEmAssinaturasAtivas: true,
          somenteAssinaturasNoValorAntigo: this.preservarNegociados,
          atualizarCobrancasPendentes: this.reajusteOpcao === 'ativasCobrancas'
        });
      })
    ).subscribe({
      next: (resultado) => {
        this.salvando.set(false);
        this.modalVisivel = false;
        this.payloadPendente = null;

        if (resultado) {
          const ignoradas = resultado.assinaturasIgnoradasIds.length;
          this.messageService.add({
            severity: 'success',
            summary: 'Reajuste aplicado',
            detail: `${resultado.assinaturasAtualizadas} assinatura(s) atualizada(s)` +
              (resultado.cobrancasAtualizadas > 0 ? `, ${resultado.cobrancasAtualizadas} cobrança(s) atualizada(s)` : '') +
              (ignoradas > 0 ? `. ${ignoradas} assinatura(s) com valor negociado foram preservadas.` : '.')
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Tudo certo!',
            detail: 'Serviço atualizado com sucesso.'
          });
        }

        this.carregarServicos();
      },
      error: (error: HttpErrorResponse) => {
        this.salvando.set(false);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }

  desativarServico(servico: ServicoResponseDTO): void {
    this.confirmationService.confirm({
      message: `Desativar ${servico.nome}?`,
      header: 'Confirmar Desativação',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, desativar',
      rejectLabel: 'Não',
      accept: () => {
        this.servicoService.deletar(servico.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'info',
              summary: 'Serviço desativado',
              detail: `${servico.nome} foi desativado.`
            });
            this.carregarServicos();
          },
          error: (error: HttpErrorResponse) => {
            const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
            this.messageService.add({
              severity: errorMessage.severity,
              summary: errorMessage.summary,
              detail: errorMessage.detail
            });
          }
        });
      }
    });
  }

  fecharModal(): void {
    this.modalVisivel = false;
    this.servicoEmEdicao = null;
  }
}
