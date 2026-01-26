import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';
import { CobrancaService } from '../../../core/services/cobranca.service';
import { AssinaturaService } from '../../../core/services/assinatura.service';
import {
  CobrancaMensalResponseDTO,
  CobrancaMensalUpdateRequestDTO,
  GerarCobrancasRequestDTO
} from '../../../core/interfaces/cobranca.interface';
import { AssinaturaResponseDTO } from '../../../core/interfaces/assinatura.interface';

@Component({
    selector: 'app-cobrancas',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputNumberModule,
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
  modalBaixaVisivel = signal(false);
  _modalBaixaVisivel = false;
  carregando = signal(false);
  salvando = signal(false);
  gerando = signal(false);
  cobrancaSelecionada = signal<CobrancaMensalResponseDTO | null>(null);

  cobrancasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const cobrancasLista = this.cobrancas();
    
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

  mesGerar: number = new Date().getMonth() + 1;
  anoGerar: number = new Date().getFullYear();

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

  constructor(
    private cobrancaService: CobrancaService,
    private assinaturaService: AssinaturaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarCobrancas();
  }

  carregarCobrancas(): void {
    this.carregando.set(true);
    this.assinaturaService.listar().subscribe({
      next: (assinaturas) => {
        const requests = assinaturas.map(assinatura =>
          this.cobrancaService.listarPorAssinatura(assinatura.id)
        );
        
        forkJoin(requests).subscribe({
          next: (arraysCobrancas) => {
            const todasCobrancas: CobrancaMensalResponseDTO[] = [];
            arraysCobrancas.forEach(cobrancas => {
              todasCobrancas.push(...cobrancas);
            });
            // Ordenar cobranças por descrição (ASC)
            const cobrancasOrdenadas = todasCobrancas.sort((a, b) => {
              const descricaoA = a.descricao?.toLowerCase() || '';
              const descricaoB = b.descricao?.toLowerCase() || '';
              return descricaoA.localeCompare(descricaoB, 'pt-BR');
            });
            this.cobrancas.set(cobrancasOrdenadas);
            this.carregando.set(false);
          },
          error: (error) => {
            console.error('Erro ao carregar cobranças:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: 'Erro ao carregar cobranças'
            });
            this.carregando.set(false);
          }
        });
      },
      error: (error) => {
        console.error('Erro ao carregar assinaturas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar assinaturas'
        });
        this.carregando.set(false);
      }
    });
  }

  gerarMensalidades(): void {
    if (!this.mesGerar || !this.anoGerar) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Informe o mês e ano para gerar as mensalidades'
      });
      return;
    }

    this.gerando.set(true);

    const request: GerarCobrancasRequestDTO = {
      mes: this.mesGerar,
      ano: this.anoGerar
    };

    this.cobrancaService.gerarMensalidades(request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Mensalidades geradas com sucesso'
        });
        this.gerando.set(false);
        setTimeout(() => this.carregarCobrancas(), 500);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao gerar mensalidades'
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
    this.modalBaixaVisivel.set(true);
    this._modalBaixaVisivel = true;
  }

  fecharModalBaixa(): void {
    this.modalBaixaVisivel.set(false);
    this._modalBaixaVisivel = false;
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

    const updateData: CobrancaMensalUpdateRequestDTO = {
      status: 'PAGO',
      dataPagamento: typeof this.baixaData.dataPagamento === 'string' 
        ? this.baixaData.dataPagamento 
        : (this.baixaData.dataPagamento as Date).toISOString().split('T')[0],
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
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao dar baixa na cobrança'
        });
        this.salvando.set(false);
      }
    });
  }

  limparPesquisa(): void {
    this.termoPesquisa.set('');
  }
}

