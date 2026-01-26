import { Component, OnInit, signal, computed } from '@angular/core';

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
    imports: [
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
    templateUrl: './pacientes.component.html',
    styleUrls: ['./pacientes.component.scss']
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
