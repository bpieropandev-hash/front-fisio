import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ServicoService } from '../../core/services/servico.service';
import { ServicoCreateRequestDTO, ServicoResponseDTO, TipoServico } from '../../core/interfaces/servico.interface';

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
    Toast
  ],
  providers: [MessageService],
  templateUrl: './servicos.component.html',
  styleUrls: ['./servicos.component.scss']
})
export class ServicosComponent implements OnInit {
  servicos = signal<ServicoResponseDTO[]>([]);
  carregando = signal(false);
  salvando = signal(false);

  modalVisivel = false;
  servicoEmEdicao: ServicoResponseDTO | null = null;

  formServico: ServicoCreateRequestDTO = this.formPadrao();

  tipoServicoOptions = [
    { label: 'Fisioterapia', value: 'FISIOTERAPIA' },
    { label: 'Pilates', value: 'PILATES' }
  ];

  constructor(
    private servicoService: ServicoService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarServicos();
  }

  private formPadrao(): ServicoCreateRequestDTO {
    return {
      nome: '',
      tipo: 'FISIOTERAPIA',
      valorBase: 0,
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

    this.salvando.set(true);

    const request$ = this.servicoEmEdicao
      ? this.servicoService.atualizar(this.servicoEmEdicao.id, this.formServico)
      : this.servicoService.criar(this.formServico);

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
      error: (error) => {
        this.salvando.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ops!',
          detail: error.error?.message || 'Não foi possível salvar o serviço.'
        });
      }
    });
  }

  desativarServico(servico: ServicoResponseDTO): void {
    if (!confirm(`Desativar ${servico.nome}?`)) {
      return;
    }

    this.servicoService.deletar(servico.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Serviço desativado',
          detail: `${servico.nome} foi desativado.`
        });
        this.carregarServicos();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível desativar o serviço.'
        });
      }
    });
  }

  fecharModal(): void {
    this.modalVisivel = false;
    this.servicoEmEdicao = null;
  }
}

