import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ServicoService } from '../../core/services/servico.service';
import { ServicoCreateRequestDTO, ServicoResponseDTO } from '../../core/interfaces/servico.interface';

@Component({
  selector: 'app-servicos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputSwitchModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h2>Serviços e valores</h2>
        <p class="subtext">Gerencie serviços de fisioterapia e pilates com facilidade.</p>
      </div>

      <p-button
        label="Novo serviço"
        icon="pi pi-plus"
        size="large"
        (onClick)="abrirModalNovo()"
      />
    </div>

    <p-table
      [value]="servicos()"
      [loading]="carregando()"
      [paginator]="true"
      [rows]="10"
      [tableStyle]="{ 'min-width': '60rem' }"
      sortField="nome"
      sortMode="single"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="nome">Serviço <p-sortIcon field="nome" /></th>
          <th>Valor Base</th>
          <th>Repasse Clínica</th>
          <th>Repasse Profissional</th>
          <th>Status</th>
          <th class="actions-col">Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-servico>
        <tr>
          <td>
            <div class="servico-title">
              <span class="name">{{ servico.nome }}</span>
              <small class="id">#{{ servico.id }}</small>
            </div>
          </td>
          <td>{{ servico.valorBase | currency:'BRL' }}</td>
          <td>{{ servico.pctClinica }}%</td>
          <td>{{ servico.pctProfissional }}%</td>
          <td>
            <p-tag
              [value]="servico.ativo ? 'Ativo' : 'Inativo'"
              [severity]="servico.ativo ? 'success' : 'warn'"
              rounded
            />
          </td>
          <td class="actions-col">
            <p-button
              icon="pi pi-pencil"
              size="small"
              rounded
              (onClick)="editarServico(servico)"
              severity="secondary"
            />
            <p-button
              icon="pi pi-trash"
              size="small"
              rounded
              severity="danger"
              [outlined]="true"
              (onClick)="desativarServico(servico)"
            />
          </td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [(visible)]="modalVisivel"
      [header]="servicoEmEdicao ? 'Editar serviço' : 'Novo serviço'"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="fecharModal()"
    >
      <div class="form-grid">
        <div class="full">
          <label>Nome do serviço *</label>
          <input
            pInputText
            [(ngModel)]="formServico.nome"
            placeholder="Ex: Pilates - Plano Mensal"
          />
        </div>

        <div>
          <label>Valor base (R$) *</label>
          <p-inputNumber
            [(ngModel)]="formServico.valorBase"
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            placeholder="0,00"
          />
        </div>

        <div>
          <label>% Clínica *</label>
          <p-inputNumber
            [(ngModel)]="formServico.pctClinica"
            suffix="%"
            [min]="0"
            [max]="100"
            [step]="1"
          />
        </div>

        <div>
          <label>% Profissional *</label>
          <p-inputNumber
            [(ngModel)]="formServico.pctProfissional"
            suffix="%"
            [min]="0"
            [max]="100"
            [step]="1"
          />
          <small class="helper">Soma ideal: 100%</small>
        </div>

        <div class="switch full">
          <label>Serviço ativo?</label>
          <p-inputSwitch [(ngModel)]="formServico.ativo" />
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          variant="text"
          (onClick)="fecharModal()"
        />
        <p-button
          label="Salvar"
          icon="pi pi-check"
          [loading]="salvando()"
          (onClick)="salvarServico()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .eyebrow {
      text-transform: uppercase;
      color: #67a4ff;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      margin-bottom: .25rem;
    }

    .subtext {
      color: #475569;
      margin-top: 0.25rem;
    }

    .servico-title {
      display: flex;
      align-items: baseline;
      gap: .5rem;
    }

    .servico-title .name {
      font-weight: 600;
    }

    .servico-title .id {
      color: #94a3b8;
    }

    .actions-col {
      display: flex;
      gap: .5rem;
      justify-content: flex-end;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .form-grid .full {
      grid-column: span 2;
    }

    label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.35rem;
    }

    .switch {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .helper {
      color: #94a3b8;
      font-size: 0.75rem;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .page-header h2 {
        font-size: 1.5rem;
        margin: 0;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .actions-col {
        justify-content: flex-start;
      }

      .dialog-footer {
        flex-direction: column-reverse;
      }

      .dialog-footer .p-button {
        width: 100%;
      }

      ::ng-deep .p-datatable {
        font-size: 0.875rem;
      }

      ::ng-deep .p-datatable .p-datatable-thead > tr > th,
      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.5rem !important;
        font-size: 0.75rem !important;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
    }

    @media (max-width: 480px) {
      .page-header h2 {
        font-size: 1.25rem;
      }

      .servico-title {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
    }
  `]
})
export class ServicosComponent implements OnInit {
  servicos = signal<ServicoResponseDTO[]>([]);
  carregando = signal(false);
  salvando = signal(false);

  modalVisivel = false;
  servicoEmEdicao: ServicoResponseDTO | null = null;

  formServico: ServicoCreateRequestDTO = this.formPadrao();

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
      valorBase: servico.valorBase,
      pctClinica: servico.pctClinica,
      pctProfissional: servico.pctProfissional,
      ativo: servico.ativo ?? true
    };
    this.modalVisivel = true;
  }

  salvarServico(): void {
    if (!this.formServico.nome || !this.formServico.valorBase) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos obrigatórios',
        detail: 'Preencha nome e valor base.'
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

