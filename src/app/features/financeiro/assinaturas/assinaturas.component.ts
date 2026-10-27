import { ConfiguracaoClinicaService } from "../../../core/services/configuracao-clinica.service";
import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from "@angular/router";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { MultiSelectModule } from "primeng/multiselect";
import { TagModule } from "primeng/tag";
import { TooltipModule } from "primeng/tooltip";
import { MessageService, ConfirmationService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { AssinaturaService } from "../../../core/services/assinatura.service";
import { PacienteService } from "../../../core/services/paciente.service";
import { ServicoService } from "../../../core/services/servico.service";
import {
  AssinaturaResponseDTO,
  AssinaturaCreateRequestDTO,
  AssinaturaUpdateRequestDTO,
  AssinaturaTrocarPlanoRequestDTO,
} from "../../../core/interfaces/assinatura.interface";
import { PacienteResponseDTO } from "../../../core/interfaces/paciente.interface";
import { ServicoResponseDTO } from "../../../core/interfaces/servico.interface";
import { ErrorHandlerUtil } from "../../../core/utils/error-handler.util";
import { formatDateForApi } from "../../../core/utils/date-format.util";
import { HttpErrorResponse } from "@angular/common/http";
import { SearchInputComponent } from "../../../shared/components/search-input/search-input.component";
import { BreakpointService } from "../../../core/services/breakpoint.service";

@Component({
  selector: "app-assinaturas",
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
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
    ConfirmDialogModule,
    SearchInputComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: "./assinaturas.component.html",
  styleUrls: ["./assinaturas.component.scss"],
})
export class AssinaturasComponent implements OnInit {
  private readonly configuracoes = inject(ConfiguracaoClinicaService);
  private readonly breakpointService = inject(BreakpointService);
  isMobile = this.breakpointService.isMobile;
  isTablet = this.breakpointService.isTablet;

  assinaturas = signal<AssinaturaResponseDTO[]>([]);
  termoPesquisa = signal<string>("");
  pacientes = signal<PacienteResponseDTO[]>([]);
  servicos = signal<ServicoResponseDTO[]>([]);
  servicosMensalidade = computed(() =>
    this.servicos().map((s) => ({
      ...s,
      nome: `${s.tipo === "PILATES" ? "Pilates" : "Fisioterapia"} · ${s.nome}`,
    })),
  );
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  tentativa: Record<string, boolean> = {};
  erroFormulario = signal("");
  erroLista = signal("");
  erroPacientes = signal("");
  erroServicos = signal("");
  carregandoPacientes = signal(false);
  carregandoServicos = signal(false);

  erroCampo(form: string, campo: string): string {
    if (!this.tentativa[form]) return "";
    const dados =
      form === "nova"
        ? this.novaAssinatura
        : form === "editar"
          ? this.edicao
          : {
              servicoId: this.trocaPlano.novoServicoId,
              valorMensal: this.trocaPlano.novoValorMensal,
              diaVencimento: this.trocaPlano.diaVencimento!,
              dataInicio: this.trocaPlano.dataInicio,
            };
    if (campo === "pacientes")
      return this.pacienteIdsSelecionados.length
        ? ""
        : "Selecione pelo menos um paciente.";
    if (campo === "servico")
      return "servicoId" in dados && dados.servicoId
        ? ""
        : "Selecione um serviço.";
    if (campo === "valor")
      return Number.isFinite(dados.valorMensal) && dados.valorMensal! >= 0.01
        ? ""
        : "Informe um valor a partir de R$ 0,01.";
    if (campo === "dia")
      return Number.isInteger(dados.diaVencimento) &&
        dados.diaVencimento! >= 1 &&
        dados.diaVencimento! <= 28
        ? ""
        : "Informe um dia inteiro entre 1 e 28.";
    if (campo === "data" && "dataInicio" in dados && dados.dataInicio) {
      const data = new Date(`${dados.dataInicio}T12:00:00`);
      return Number.isNaN(data.getTime()) ||
        formatDateForApi(data) !== dados.dataInicio
        ? "Informe uma data válida."
        : "";
    }
    return "";
  }

  private validarFormulario(form: string): boolean {
    this.tentativa[form] = true;
    const campos =
      form === "nova"
        ? ["pacientes", "servico", "valor", "dia", "data"]
        : form === "editar"
          ? ["valor", "dia"]
          : ["servico", "valor", "dia", "data"];
    if (!campos.some((campo) => this.erroCampo(form, campo))) return true;
    setTimeout(() =>
      this.element.nativeElement
        .querySelector<HTMLElement>(
          '.field-invalid input, .field-invalid [role="combobox"]',
        )
        ?.focus(),
    );
    return false;
  }

  modalVisivel = false;
  modalEditarVisivel = false;
  carregando = signal(false);
  salvando = signal(false);

  assinaturaEditando: AssinaturaResponseDTO | null = null;
  edicao: AssinaturaUpdateRequestDTO = {
    valorMensal: undefined,
    diaVencimento: undefined,
  };

  modalTrocarPlanoVisivel = false;
  assinaturaTrocandoPlano: AssinaturaResponseDTO | null = null;
  trocaPlano: Partial<AssinaturaTrocarPlanoRequestDTO> = {};

  filtroStatus = signal<"todas" | "ativas" | "canceladas">("todas");
  filtroServicoId = signal<number>(0);
  filtroDiaVencimento = signal(0);
  diasVencimentoOptions = Array.from({ length: 28 }, (_, i) => ({ label: `Dia ${i + 1}`, value: i + 1 }));
  assinaturaCobranca = signal<AssinaturaResponseDTO | null>(null);
  gerandoCobranca = signal(false);
  erroCobranca = signal("");

  filtroStatusOptions: {
    label: string;
    value: "todas" | "ativas" | "canceladas";
  }[] = [
    { label: "Todas", value: "todas" },
    { label: "Ativas", value: "ativas" },
    { label: "Canceladas", value: "canceladas" },
  ];

  assinaturasFiltradas = computed(() => {
    const termo = this.termoPesquisa().toLowerCase().trim();
    const filtroStatus = this.filtroStatus();
    const filtroServicoId = this.filtroServicoId();
    let assinaturasLista = this.assinaturas();

    if (filtroStatus === "ativas") {
      assinaturasLista = assinaturasLista.filter((a) => a.ativo);
    } else if (filtroStatus === "canceladas") {
      assinaturasLista = assinaturasLista.filter((a) => !a.ativo);
    }

    if (filtroServicoId) {
      assinaturasLista = assinaturasLista.filter(
        (a) => a.servicoId === filtroServicoId,
      );
    }

    if (this.filtroDiaVencimento()) {
      assinaturasLista = assinaturasLista.filter(a => a.diaVencimento === this.filtroDiaVencimento());
    }
    if (!termo) {
      return assinaturasLista;
    }

    return assinaturasLista.filter((assinatura) => {
      const pacienteNome = assinatura.pacienteNome?.toLowerCase() || "";
      const servicoNome = assinatura.servicoNome?.toLowerCase() || "";
      const valorMensal = assinatura.valorMensal?.toString() || "";
      const diaVencimento = assinatura.diaVencimento?.toString() || "";

      return (
        pacienteNome.includes(termo) ||
        servicoNome.includes(termo) ||
        valorMensal.includes(termo) ||
        diaVencimento.includes(termo)
      );
    });
  });

  assinaturaAcaoAberta = signal<AssinaturaResponseDTO | null>(null);

  totalAssinaturasAtivas = computed(
    () => this.assinaturas().filter((a) => a.ativo).length,
  );
  receitaMensalAtiva = computed(() =>
    this.assinaturas()
      .filter((a) => a.ativo)
      .reduce((soma, a) => soma + (a.valorMensal || 0), 0),
  );

  pacienteIdsSelecionados: number[] = [];
  novaAssinatura: Partial<AssinaturaCreateRequestDTO> = {
    servicoId: 0,
    valorMensal: undefined,
    diaVencimento: 5,
    dataInicio: undefined,
  };

  constructor(
    private assinaturaService: AssinaturaService,
    private pacienteService: PacienteService,
    private servicoService: ServicoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    const params = this.route.snapshot.queryParamMap;
    const statusParam = params.get("status");
    if (statusParam === "ativas" || statusParam === "canceladas") {
      this.filtroStatus.set(statusParam);
    }
    const vencimento = Number(params.get("vencimento"));
    this.filtroDiaVencimento.set(Number.isInteger(vencimento) && vencimento >= 1 && vencimento <= 28 ? vencimento : 0);
    const servicoParam = params.get("servico");
    if (servicoParam) {
      this.filtroServicoId.set(Number(servicoParam));
    }
  }

  aoMudarFiltroStatus(valor: "todas" | "ativas" | "canceladas"): void {
    this.filtroStatus.set(valor);
    this.atualizarQueryParams();
  }

  proximoVencimento(assinatura: AssinaturaResponseDTO): Date | null {
    if (!assinatura.ativo) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(`${assinatura.dataInicio}T00:00:00`);
    const referencia = inicio > hoje ? inicio : hoje;
    const vencimento = new Date(
      referencia.getFullYear(),
      referencia.getMonth(),
      assinatura.diaVencimento,
    );
    if (vencimento < referencia) vencimento.setMonth(vencimento.getMonth() + 1);
    return vencimento;
  }

  abrirAcoes(assinatura: AssinaturaResponseDTO): void {
    this.assinaturaAcaoAberta.set(assinatura);
  }

  fecharAcoes(): void {
    this.assinaturaAcaoAberta.set(null);
  }

  aoMudarFiltroServico(valor: number | null): void {
    this.filtroServicoId.set(valor ?? 0);
    this.atualizarQueryParams();
  }

  aoMudarFiltroVencimento(valor: number | null): void {
    this.filtroDiaVencimento.set(Number.isInteger(valor) && valor! >= 1 && valor! <= 28 ? valor! : 0);
    this.atualizarQueryParams();
  }

  private atualizarQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.filtroStatus() === "todas" ? null : this.filtroStatus(),
        servico: this.filtroServicoId() || null,
        vencimento: this.filtroDiaVencimento() || null,
      },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  ngOnInit(): void {
    this.carregarDados();
    if (this.route.snapshot.queryParamMap.get("nova") === "true")
      this.abrirModalNovaAssinatura();
  }

  carregarDados(): void {
    this.carregando.set(true);
    this.erroLista.set("");
    this.assinaturaService.listar().subscribe({
      next: (assinaturas) => {
        // Ordenar assinaturas por nome do paciente (ASC)
        const assinaturasOrdenadas = assinaturas.sort((a, b) => {
          const nomeA = a.pacienteNome?.toLowerCase() || "";
          const nomeB = b.pacienteNome?.toLowerCase() || "";
          return nomeA.localeCompare(nomeB, "pt-BR");
        });
        this.assinaturas.set(assinaturasOrdenadas);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.erroLista.set(
          "Não foi possível carregar as assinaturas. Tente novamente.",
        );
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail,
        });
        this.carregando.set(false);
      },
    });

    this.carregarOpcoes();
  }

  carregarOpcoes(): void {
    this.carregandoPacientes.set(true);
    this.carregandoServicos.set(true);
    this.erroPacientes.set("");
    this.erroServicos.set("");
    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes.filter((p) => p.ativo !== false));
        this.carregandoPacientes.set(false);
      },
      error: () => {
        this.pacientes.set([]);
        this.erroPacientes.set("Não foi possível carregar os pacientes.");
        this.carregandoPacientes.set(false);
      },
    });
    this.servicoService.listar().subscribe({
      next: (servicos) => {
        this.servicos.set(servicos.filter((s) => s.ativo !== false));
        this.carregandoServicos.set(false);
      },
      error: () => {
        this.servicos.set([]);
        this.erroServicos.set("Não foi possível carregar os serviços.");
        this.carregandoServicos.set(false);
      },
    });
  }

  abrirModalNovaAssinatura(): void {
    this.tentativa["nova"] = false;
    this.erroFormulario.set("");
    this.pacienteIdsSelecionados = [];
    this.novaAssinatura = {
      servicoId: 0,
      valorMensal:
        this.configuracoes.atual().mensalidadeValorPadrao || undefined,
      diaVencimento: this.configuracoes.atual().mensalidadeDiaVencimento,
      dataInicio: undefined,
    };
    this.modalVisivel = true;
  }

  fecharModal(): void {
    if (this.salvando()) return;
    this.modalVisivel = false;
  }

  criarAssinatura(): void {
    if (
      this.salvando() ||
      this.carregandoServicos() ||
      !!this.erroServicos() ||
      this.carregandoPacientes() ||
      !!this.erroPacientes()
    )
      return;
    if (!this.validarFormulario("nova")) return;
    this.erroFormulario.set("");

    this.salvando.set(true);

    const data: AssinaturaCreateRequestDTO = {
      pacienteIds: this.pacienteIdsSelecionados,
      servicoId: this.novaAssinatura.servicoId!,
      valorMensal: this.novaAssinatura.valorMensal!,
      diaVencimento: this.novaAssinatura.diaVencimento!,
      dataInicio:
        this.novaAssinatura.dataInicio || formatDateForApi(new Date()),
    };

    this.assinaturaService.criar(data).subscribe({
      next: (assinaturasCriadas) => {
        const quantidade = assinaturasCriadas.length;
        this.messageService.add({
          severity: "success",
          summary: "Sucesso",
          detail:
            quantidade === 1
              ? "Assinatura criada com sucesso"
              : `${quantidade} assinaturas criadas com sucesso`,
        });
        this.salvando.set(false);
        this.fecharModal();
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        // Mensagem específica para conflito (assinatura já existe)
        if (error.status === 409 || error.status === 400) {
          errorMessage.detail =
            errorMessage.detail ||
            "Erro ao criar assinatura(s). Verifique se os pacientes estão ativos e não possuem assinatura ativa para este serviço.";
        }
        this.erroFormulario.set(
          errorMessage.detail || "Não foi possível salvar. Tente novamente.",
        );
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail,
        });
        this.salvando.set(false);
      },
    });
  }

  confirmarCancelamento(assinatura: AssinaturaResponseDTO): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja cancelar o plano de ${assinatura.pacienteNome}?`,
      header: "Confirmar Cancelamento",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sim, cancelar",
      rejectLabel: "Não",
      accept: () => {
        this.cancelarAssinatura(assinatura.id);
      },
    });
  }

  cancelarAssinatura(id: number): void {
    this.salvando.set(true);
    this.assinaturaService.cancelar(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: "success",
          summary: "Sucesso",
          detail: "Assinatura cancelada com sucesso",
        });
        this.carregarDados();
        this.salvando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail,
        });
        this.salvando.set(false);
      },
    });
  }

  abrirModalEditar(assinatura: AssinaturaResponseDTO): void {
    this.tentativa["editar"] = false;
    this.erroFormulario.set("");
    this.assinaturaEditando = assinatura;
    this.edicao = {
      valorMensal: assinatura.valorMensal,
      diaVencimento: assinatura.diaVencimento,
    };
    this.modalEditarVisivel = true;
  }

  fecharModalEditar(): void {
    if (this.salvando()) return;
    this.modalEditarVisivel = false;
    this.assinaturaEditando = null;
  }

  salvarEdicao(): void {
    if (this.salvando() || !this.assinaturaEditando) return;
    if (!this.validarFormulario("editar")) return;
    this.erroFormulario.set("");

    this.salvando.set(true);
    this.assinaturaService
      .atualizar(this.assinaturaEditando.id, this.edicao)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            summary: "Sucesso",
            detail: "Assinatura atualizada com sucesso",
          });
          this.salvando.set(false);
          this.fecharModalEditar();
          this.carregarDados();
          this.salvando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
          this.erroFormulario.set(
            errorMessage.detail || "Não foi possível salvar. Tente novamente.",
          );
          this.messageService.add({
            severity: errorMessage.severity,
            summary: errorMessage.summary,
            detail: errorMessage.detail,
          });
          this.salvando.set(false);
        },
      });
  }

  confirmarReativacao(assinatura: AssinaturaResponseDTO): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja reativar o plano de ${assinatura.pacienteNome}?`,
      header: "Confirmar Reativação",
      icon: "pi pi-question-circle",
      acceptLabel: "Sim, reativar",
      rejectLabel: "Não",
      accept: () => {
        this.reativarAssinatura(assinatura.id);
      },
    });
  }

  abrirModalTrocarPlano(assinatura: AssinaturaResponseDTO): void {
    this.tentativa["trocar"] = false;
    this.erroFormulario.set("");
    this.assinaturaTrocandoPlano = assinatura;
    this.trocaPlano = {
      novoServicoId: undefined,
      novoValorMensal: undefined,
      diaVencimento: assinatura.diaVencimento,
      dataInicio: undefined,
    };
    this.modalTrocarPlanoVisivel = true;
  }

  fecharModalTrocarPlano(): void {
    if (this.salvando()) return;
    this.modalTrocarPlanoVisivel = false;
    this.assinaturaTrocandoPlano = null;
  }

  aoSelecionarNovoServico(): void {
    const servico = this.servicos().find(
      (s) => s.id === this.trocaPlano.novoServicoId,
    );
    if (servico) {
      this.trocaPlano.novoValorMensal = servico.valorBase;
    }
  }

  confirmarTrocarPlano(): void {
    if (
      this.salvando() ||
      !this.assinaturaTrocandoPlano ||
      this.carregandoServicos() ||
      !!this.erroServicos()
    )
      return;
    if (!this.validarFormulario("trocar")) return;
    this.erroFormulario.set("");

    this.salvando.set(true);

    const data: AssinaturaTrocarPlanoRequestDTO = {
      novoServicoId: this.trocaPlano.novoServicoId!,
      novoValorMensal: this.trocaPlano.novoValorMensal!,
      diaVencimento: this.trocaPlano.diaVencimento!,
      dataInicio: this.trocaPlano.dataInicio || formatDateForApi(new Date()),
    };

    this.assinaturaService
      .trocarPlano(this.assinaturaTrocandoPlano.id, data)
      .subscribe({
        next: (resultado) => {
          this.messageService.add({
            severity: "success",
            summary: "Plano trocado",
            detail: resultado.cobrancaMesAtualMantida
              ? "Nova assinatura criada. A cobrança já gerada neste mês para o plano antigo foi mantida."
              : "Nova assinatura criada com sucesso.",
          });
          this.salvando.set(false);
          this.fecharModalTrocarPlano();
          this.carregarDados();
          this.salvando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
          this.erroFormulario.set(
            errorMessage.detail || "Não foi possível salvar. Tente novamente.",
          );
          this.messageService.add({
            severity: errorMessage.severity,
            summary: errorMessage.summary,
            detail: errorMessage.detail,
          });
          this.salvando.set(false);
        },
      });
  }

  gerarCobrancaAtual(): void {
    const assinatura = this.assinaturaCobranca();
    if (!assinatura || this.gerandoCobranca()) return;
    this.gerandoCobranca.set(true);
    this.erroCobranca.set("");
    this.assinaturaService.gerarCobrancaMesAtual(assinatura.id).subscribe({
      next: resultado => {
        this.gerandoCobranca.set(false);
        this.assinaturaCobranca.set(null);
        this.messageService.add({ severity: "success", summary: "Cobrança do mês",
          detail: resultado.gerada ? "Cobrança gerada com sucesso." : "A cobrança deste mês já existe e foi mantida." });
      },
      error: (error: HttpErrorResponse) => {
        this.gerandoCobranca.set(false);
        this.erroCobranca.set(ErrorHandlerUtil.getErrorMessage(error).detail || "Não foi possível gerar a cobrança. Tente novamente.");
      }
    });
  }

  reativarAssinatura(id: number): void {
    if (this.salvando() || this.gerandoCobranca()) return;
    this.salvando.set(true);
    this.assinaturaService.reativar(id).subscribe({
      next: (assinatura) => {
        this.messageService.add({
          severity: "success",
          summary: "Sucesso",
          detail: "Assinatura reativada com sucesso",
        });
        this.carregarDados();
        this.salvando.set(false);
        this.assinaturaCobranca.set(assinatura);
        this.erroCobranca.set("");
        this.confirmationService.confirm({
          header: "Gerar cobrança do mês?",
          message: `Gerar a cobrança do mês corrente para ${assinatura.pacienteNome}? Se já existir, ela será mantida.`,
          acceptLabel: "Gerar cobrança",
          rejectLabel: "Agora não",
          accept: () => this.gerarCobrancaAtual(),
          reject: () => this.assinaturaCobranca.set(null),
        });
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        if (error.status === 400) {
          errorMessage.detail =
            errorMessage.detail ||
            "Já existe uma assinatura ativa para este paciente e serviço.";
        }
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail,
        });
        this.salvando.set(false);
      },
    });
  }
}
