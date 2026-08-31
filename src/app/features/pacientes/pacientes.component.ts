import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PacienteService } from '../../core/services/paciente.service';
import { RelatorioService } from '../../core/services/relatorio.service';
import { PacienteResponseDTO, PacienteCreateRequestDTO } from '../../core/interfaces/paciente.interface';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';
import { formatDateForApi, formatDateTimeForApi } from '../../core/utils/date-format.util';
import { HttpErrorResponse } from '@angular/common/http';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { AgendamentoService } from '../../core/services/agendamento.service';

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
    ToggleSwitch,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    SearchInputComponent
],
    providers: [MessageService, ConfirmationService],
    templateUrl: './pacientes.component.html',
    styleUrls: ['./pacientes.component.scss']
})
export class PacientesComponent implements OnInit {
  private readonly breakpointService = inject(BreakpointService);
  isMobile = this.breakpointService.isMobile;
  isTablet = this.breakpointService.isTablet;

  pacientes = signal<PacienteResponseDTO[]>([]);
  termoPesquisa = signal<string>('');
  carregando = signal(false);
  salvando = signal(false);
  modalVisivel = false;
  pacienteEmEdicao: PacienteResponseDTO | null = null;
  pacienteForm: FormGroup;

  mostrarInativos = signal(false);
  filtroAssinatura = signal<'todos' | 'com' | 'sem'>('todos');

  filtroAssinaturaOptions = [
    { label: 'Todos', value: 'todos' },
    { label: 'Com assinatura ativa', value: 'com' },
    { label: 'Sem assinatura ativa', value: 'sem' }
  ];

  pacientesFiltrados = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const mostrarInativos = this.mostrarInativos();
    const filtroAssinatura = this.filtroAssinatura();
    let pacientesLista = this.pacientes();

    if (!mostrarInativos) {
      pacientesLista = pacientesLista.filter(p => p.ativo !== false);
    }

    if (filtroAssinatura === 'com') {
      pacientesLista = pacientesLista.filter(p => p.possuiAssinaturaAtiva === true);
    } else if (filtroAssinatura === 'sem') {
      pacientesLista = pacientesLista.filter(p => p.possuiAssinaturaAtiva !== true);
    }

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

  // --- Shell mobile (spec 10) ---
  filtroPillMobile = signal<'todos' | 'tratamento' | 'inativos'>('todos');
  proximosPorPaciente = signal<Map<number, Date>>(new Map());

  totalAtivos = computed(() => this.pacientes().filter(p => p.ativo !== false).length);

  pacientesMobile = computed(() => {
    const base = this.pacientesFiltrados();
    if (this.filtroPillMobile() === 'inativos') {
      return base.filter(p => p.ativo === false);
    }
    return base;
  });

  pacientesAgrupados = computed(() => {
    const grupos = new Map<string, PacienteResponseDTO[]>();
    for (const p of this.pacientesMobile()) {
      const letra = (p.nome?.charAt(0) || '#').toUpperCase();
      if (!grupos.has(letra)) grupos.set(letra, []);
      grupos.get(letra)!.push(p);
    }
    return Array.from(grupos.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([letra, pacientesDoGrupo]) => ({ letra, pacientes: pacientesDoGrupo }));
  });

  selecionarPillMobile(pill: 'todos' | 'tratamento' | 'inativos'): void {
    this.filtroPillMobile.set(pill);
    if (pill === 'inativos') {
      this.mostrarInativos.set(true);
      this.filtroAssinatura.set('todos');
    } else if (pill === 'tratamento') {
      this.mostrarInativos.set(false);
      this.filtroAssinatura.set('com');
    } else {
      this.mostrarInativos.set(false);
      this.filtroAssinatura.set('todos');
    }
    this.atualizarQueryParams();
  }

  obterIniciais(nome: string | undefined): string {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.charAt(0) || '';
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (primeira + ultima).toUpperCase();
  }

  rotuloProximoAtendimento(pacienteId: number): string {
    const data = this.proximosPorPaciente().get(pacienteId);
    if (!data) return 'Sem atendimento agendado';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const alvo = new Date(data);
    alvo.setHours(0, 0, 0, 0);

    const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(data);
    if (alvo.getTime() === hoje.getTime()) return `Próximo: hoje, ${hora}`;
    if (alvo.getTime() === amanha.getTime()) return `Próximo: amanhã, ${hora}`;
    const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(data);
    return `Próximo: ${dataFmt}, ${hora}`;
  }

  private carregarProximosAtendimentos(): void {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 60);

    this.agendamentoService.listar({
      dataInicio: formatDateTimeForApi(hoje),
      dataFim: formatDateTimeForApi(limite, true)
    }).subscribe({
      next: (atendimentos) => {
        const mapa = new Map<number, Date>();
        for (const a of atendimentos) {
          if (a.status !== 'AGENDADO') continue;
          const data = new Date(a.dataHoraInicio);
          const atual = mapa.get(a.pacienteId);
          if (!atual || data < atual) mapa.set(a.pacienteId, data);
        }
        this.proximosPorPaciente.set(mapa);
      },
      error: () => {
        // Não é crítico: lista de pacientes continua funcional sem o rótulo de próximo atendimento
      }
    });
  }

  constructor(
    private pacienteService: PacienteService,
    private relatorioService: RelatorioService,
    private agendamentoService: AgendamentoService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const params = this.route.snapshot.queryParamMap;
    this.mostrarInativos.set(params.get('inativos') === '1');
    const filtroAssinaturaParam = params.get('assinatura');
    if (filtroAssinaturaParam === 'com' || filtroAssinaturaParam === 'sem') {
      this.filtroAssinatura.set(filtroAssinaturaParam);
    }

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
    this.carregarProximosAtendimentos();
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

  aoMudarMostrarInativos(valor: boolean): void {
    this.mostrarInativos.set(valor);
    this.atualizarQueryParams();
  }

  aoMudarFiltroAssinatura(valor: 'todos' | 'com' | 'sem'): void {
    this.filtroAssinatura.set(valor);
    this.atualizarQueryParams();
  }

  private atualizarQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        inativos: this.mostrarInativos() ? '1' : null,
        assinatura: this.filtroAssinatura() === 'todos' ? null : this.filtroAssinatura()
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
      dataNascimento: formValue.dataNascimento ? formatDateForApi(formValue.dataNascimento) : undefined,
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

  confirmarInativacao(paciente: PacienteResponseDTO): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja inativar ${paciente.nome}?`,
      header: 'Confirmar Inativação',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, inativar',
      rejectLabel: 'Não',
      accept: () => {
        this.pacienteService.inativar(paciente.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Sucesso',
              detail: 'Paciente inativado com sucesso'
            });
            this.carregarPacientes();
          },
          error: (error: HttpErrorResponse) => {
            const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
            if (error.status === 400) {
              errorMessage.detail = errorMessage.detail || 'Paciente possui assinatura ativa. Cancele-a antes de inativar.';
            }
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

  reativarPaciente(paciente: PacienteResponseDTO): void {
    this.pacienteService.reativar(paciente.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Paciente reativado com sucesso'
        });
        this.carregarPacientes();
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
