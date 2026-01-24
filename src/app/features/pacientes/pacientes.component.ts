import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PacienteService } from '../../core/services/paciente.service';
import { RelatorioService } from '../../core/services/relatorio.service';
import { PacienteResponseDTO, PacienteCreateRequestDTO } from '../../core/interfaces/paciente.interface';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputMaskModule,
    DatePickerModule,
    TextareaModule,
    TagModule,
    TooltipModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="page-header">
      <h2>Pacientes</h2>
      <p-button
        label="Novo Paciente"
        icon="pi pi-plus"
        (onClick)="abrirModalNovoPaciente()"
      />
    </div>

    <div class="search-container">
      <div class="search-wrapper">
        <input
          type="text"
          pInputText
          placeholder="Pesquisar pacientes por nome, CPF, email ou telefone..."
          [ngModel]="termoPesquisa()"
          (ngModelChange)="termoPesquisa.set($event)"
          class="search-input"
        />
        @if (termoPesquisa()) {
          <p-button
            icon="pi pi-times"
            (onClick)="limparPesquisa()"
            styleClass="p-button-text p-button-rounded p-button-plain clear-button"
            pTooltip="Limpar pesquisa"
            [rounded]="true"
          />
        }
      </div>
      @if (termoPesquisa() && pacientesFiltrados().length > 0) {
        <div class="search-results-info">
          <i class="pi pi-info-circle"></i>
          <span>{{ pacientesFiltrados().length }} paciente(s) encontrado(s)</span>
        </div>
      }
      @if (termoPesquisa() && pacientesFiltrados().length === 0) {
        <div class="search-no-results">
          <i class="pi pi-search"></i>
          <span>Nenhum paciente encontrado com o termo "{{ termoPesquisa() }}"</span>
        </div>
      }
    </div>

    <p-table
      [value]="pacientesFiltrados()"
      [paginator]="true"
      [rows]="10"
      [loading]="carregando()"
      [tableStyle]="{ 'min-width': '40rem' }"
      styleClass="compact-table"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Telefone</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-paciente>
        <tr>
          <td>{{ paciente.nome }}</td>
          <td>{{ formatarCPF(paciente.cpf) }}</td>
          <td>{{ paciente.telefone || '-' }}</td>
          <td>
            <p-tag
              [value]="paciente.ativo !== false ? 'Ativo' : 'Inativo'"
              [severity]="paciente.ativo !== false ? 'success' : 'danger'"
            />
          </td>
          <td style="display: flex; justify-content: center;">
            <div class="action-buttons">
              <p-button
                icon="pi pi-file-pdf"
                label="Prontuário PDF"
                (onClick)="baixarProntuario(paciente.id, paciente.nome)"
                styleClass="p-button-sm"
                severity="secondary"
              />
              <p-button
                icon="pi pi-pencil"
                (onClick)="abrirModalEdicao(paciente)"
                styleClass="p-button-text p-button-rounded"
                pTooltip="Editar"
              />
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Modal Criar/Editar Paciente -->
    <p-dialog
      [(visible)]="modalVisivel"
      [header]="pacienteEmEdicao ? 'Editar Paciente' : 'Novo Paciente'"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1000px', maxHeight: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="fecharModal()"
    >
      <form [formGroup]="pacienteForm" (ngSubmit)="salvarPaciente()">
        <div class="form-row">
          <div class="form-group full-width">
            <label for="nome">Nome *</label>
            <input
              id="nome"
              type="text"
              pInputText
              formControlName="nome"
              placeholder="Nome completo"
              [class.ng-invalid]="pacienteForm.get('nome')?.invalid && pacienteForm.get('nome')?.touched"
            />
            @if (pacienteForm.get('nome')?.invalid && pacienteForm.get('nome')?.touched) {
              <small class="error-text">Nome é obrigatório</small>
            }
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cpf">CPF *</label>
            <input
              id="cpf"
              type="text"
              pInputText
              formControlName="cpf"
              placeholder="000.000.000-00"
              [class.ng-invalid]="pacienteForm.get('cpf')?.invalid && pacienteForm.get('cpf')?.touched"
            />
            @if (pacienteForm.get('cpf')?.invalid && pacienteForm.get('cpf')?.touched) {
              <small class="error-text">CPF é obrigatório</small>
            }
          </div>

          <div class="form-group">
            <label for="dataNascimento">Data de Nascimento</label>
            <p-datepicker
              id="dataNascimento"
              formControlName="dataNascimento"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              styleClass="full-width"
              [appendTo]="'body'"
              [showButtonBar]="true"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="telefone">Telefone</label>
            <input
              id="telefone"
              type="text"
              pInputText
              formControlName="telefone"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              pInputText
              formControlName="email"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cep">CEP</label>
            <input
              id="cep"
              type="text"
              pInputText
              formControlName="cep"
              placeholder="00000-000"
            />
          </div>

          <div class="form-group full-width">
            <label for="logradouro">Logradouro</label>
            <input
              id="logradouro"
              type="text"
              pInputText
              formControlName="logradouro"
              placeholder="Rua, Avenida, etc."
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="numero">Número</label>
            <input
              id="numero"
              type="text"
              pInputText
              formControlName="numero"
              placeholder="123"
            />
          </div>

          <div class="form-group">
            <label for="bairro">Bairro</label>
            <input
              id="bairro"
              type="text"
              pInputText
              formControlName="bairro"
              placeholder="Bairro"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cidade">Cidade</label>
            <input
              id="cidade"
              type="text"
              pInputText
              formControlName="cidade"
              placeholder="Cidade"
            />
          </div>

          <div class="form-group">
            <label for="estado">Estado</label>
            <input
              id="estado"
              type="text"
              pInputText
              formControlName="estado"
              placeholder="UF"
              maxlength="2"
            />
          </div>

          <div class="form-group">
            <label for="complemento">Complemento</label>
            <input
              id="complemento"
              type="text"
              pInputText
              formControlName="complemento"
              placeholder="Apto, Bloco, etc."
            />
          </div>
        </div>

        <div class="form-group">
          <label for="anamnese">Anamnese</label>
          <textarea
            id="anamnese"
            pInputTextarea
            formControlName="anamnese"
            rows="6"
            placeholder="Informações médicas relevantes..."
            styleClass="full-width"
          ></textarea>
        </div>

        <div class="dialog-footer">
          <p-button
            label="Cancelar"
            icon="pi pi-times"
            (onClick)="fecharModal()"
            styleClass="p-button-text"
          />
          <p-button
            type="submit"
            [label]="pacienteEmEdicao ? 'Atualizar' : 'Criar'"
            icon="pi pi-check"
            [loading]="salvando()"
            [disabled]="pacienteForm.invalid"
          />
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .search-container {
      margin-bottom: 24px;
    }

    .search-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-primary);
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border-color);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .search-wrapper:focus-within {
      box-shadow: 0 4px 16px rgba(76, 201, 240, 0.15);
      border-color: #4cc9f0;
      transform: translateY(-1px);
    }

    .search-input {
      flex: 1;
      width: 100%;
      font-size: larger;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .search-input:focus {
      outline: none;
      border-color: #4cc9f0;
      box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.1);
      background: var(--bg-primary);
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    .clear-button {
      min-width: 40px;
      height: 40px;
      padding: 0;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      border-radius: 50%;
    }

    .clear-button:hover {
      background: rgba(76, 201, 240, 0.1);
      color: #4cc9f0;
      transform: scale(1.1) rotate(90deg);
    }

    .search-results-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(76, 201, 240, 0.1);
      color: #0ea5e9;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      animation: fadeIn 0.3s ease;
      border-left: 3px solid #4cc9f0;
    }

    .search-results-info i {
      font-size: 1rem;
    }

    .search-no-results {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
      padding: 24px;
      background: var(--bg-secondary);
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 0.95rem;
      animation: fadeIn 0.3s ease;
      border: 1px dashed var(--border-color);
    }

    .search-no-results i {
      font-size: 1.5rem;
      color: var(--text-tertiary);
      opacity: 0.6;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    ::ng-deep .compact-table .p-datatable-thead > tr > th {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      text-align: center;
    }

    ::ng-deep .compact-table .p-datatable-tbody > tr > td {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      text-align: center;
      justify-content: center;
    }

    ::ng-deep .compact-table {
      font-size: 0.9rem;
    }

    .form-row {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      flex: 1 1 100%;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-color);
    }

    .full-width {
      width: 100%;
    }

    .error-text {
      color: var(--red-500);
      font-size: 12px;
      margin-top: 4px;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--surface-border);
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
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

      .form-row {
        flex-direction: column;
      }

      .form-group {
        width: 100%;
      }

      .search-wrapper {
        flex-direction: column;
        align-items: stretch;
      }

      .search-wrapper .clear-button {
        align-self: flex-end;
        margin-top: 8px;
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

      ::ng-deep .p-datatable .p-datatable-thead > tr > th,
      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.375rem !important;
        font-size: 0.7rem !important;
      }
    }
  `]
})
export class PacientesComponent implements OnInit {
  pacientes = signal<PacienteResponseDTO[]>([]);
  termoPesquisa = signal<string>('');
  carregando = signal(false);
  salvando = signal(false);
  modalVisivel = false;
  pacienteEmEdicao: PacienteResponseDTO | null = null;
  pacienteForm: FormGroup;

  pacientesFiltrados = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const pacientesLista = this.pacientes();

    if (!termo) {
      return pacientesLista;
    }

    return pacientesLista.filter(paciente => {
      const nome = paciente.nome?.toLowerCase() || '';
      const cpf = paciente.cpf?.toLowerCase() || '';
      const email = paciente.email?.toLowerCase() || '';
      const telefone = paciente.telefone?.toLowerCase() || '';

      return nome.includes(termo) ||
        cpf.includes(termo) ||
        email.includes(termo) ||
        telefone.includes(termo);
    });
  });

  constructor(
    private pacienteService: PacienteService,
    private relatorioService: RelatorioService,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.pacienteForm = this.fb.group({
      nome: ['', Validators.required],
      cpf: ['', Validators.required],
      dataNascimento: [null],
      telefone: [''],
      email: [''],
      logradouro: [''],
      numero: [''],
      bairro: [''],
      cidade: [''],
      estado: [''],
      cep: [''],
      complemento: [''],
      anamnese: ['']
    });
  }

  ngOnInit(): void {
    this.carregarPacientes();
  }

  carregarPacientes(): void {
    this.carregando.set(true);
    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        // Ordenar pacientes por nome
        const pacientesOrdenados = pacientes.sort((a, b) => {
          const nomeA = a.nome?.toLowerCase() || '';
          const nomeB = b.nome?.toLowerCase() || '';
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });
        this.pacientes.set(pacientesOrdenados);
        this.carregando.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar pacientes:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar pacientes'
        });
        this.carregando.set(false);
      }
    });
  }

  limparPesquisa(): void {
    this.termoPesquisa.set('');
  }


  abrirModalNovoPaciente(): void {
    this.pacienteEmEdicao = null;
    this.pacienteForm.reset();
    this.modalVisivel = true;
  }

  abrirModalEdicao(paciente: PacienteResponseDTO): void {
    this.pacienteEmEdicao = paciente;
    this.pacienteForm.patchValue({
      nome: paciente.nome,
      cpf: paciente.cpf,
      dataNascimento: paciente.dataNascimento ? new Date(paciente.dataNascimento) : null,
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      logradouro: paciente.logradouro || '',
      numero: paciente.numero || '',
      bairro: paciente.bairro || '',
      cidade: paciente.cidade || '',
      estado: paciente.estado || '',
      cep: paciente.cep || '',
      complemento: paciente.complemento || '',
      anamnese: paciente.anamnese || ''
    });
    this.modalVisivel = true;
  }

  fecharModal(): void {
    this.modalVisivel = false;
    this.pacienteEmEdicao = null;
    this.pacienteForm.reset();
  }

  salvarPaciente(): void {
    if (this.pacienteForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    this.salvando.set(true);

    const formValue = this.pacienteForm.value;
    const pacienteData: PacienteCreateRequestDTO = {
      nome: formValue.nome,
      cpf: formValue.cpf.replace(/\D/g, ''),
      dataNascimento: formValue.dataNascimento ? formValue.dataNascimento.toISOString().split('T')[0] : undefined,
      telefone: formValue.telefone || undefined,
      email: formValue.email || undefined,
      logradouro: formValue.logradouro || undefined,
      numero: formValue.numero || undefined,
      bairro: formValue.bairro || undefined,
      cidade: formValue.cidade || undefined,
      estado: formValue.estado || undefined,
      cep: formValue.cep || undefined,
      complemento: formValue.complemento || undefined,
      anamnese: formValue.anamnese || undefined
    };

    if (this.pacienteEmEdicao) {
      this.pacienteService.atualizar(this.pacienteEmEdicao.id, pacienteData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Paciente atualizado com sucesso'
          });
          this.fecharModal();
          this.carregarPacientes();
          this.salvando.set(false);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: error.error?.message || 'Erro ao atualizar paciente'
          });
          this.salvando.set(false);
        }
      });
    } else {
      this.pacienteService.criar(pacienteData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Paciente criado com sucesso'
          });
          this.fecharModal();
          this.carregarPacientes();
          this.salvando.set(false);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: error.error?.message || 'Erro ao criar paciente'
          });
          this.salvando.set(false);
        }
      });
    }
  }

  formatarCPF(cpf: string): string {
    if (!cpf) return '-';
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return cpf;
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  baixarProntuario(pacienteId: number, pacienteNome: string): void {
    this.relatorioService.baixarProntuario(pacienteId).subscribe({
      next: (blob) => {
        // Verifica se o blob não está vazio
        if (blob.size === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Aviso',
            detail: 'O prontuário está vazio ou não há dados para exibir.'
          });
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prontuario_${pacienteNome.replace(/\s+/g, '_')}_${pacienteId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Prontuário baixado com sucesso'
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao baixar prontuário:', error);

        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);

        // Mensagem específica para 404 (paciente não encontrado)
        if (error.status === 404) {
          errorMessage.detail = 'Paciente não encontrado ou não possui atendimentos concluídos.';
        }

        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }
}
