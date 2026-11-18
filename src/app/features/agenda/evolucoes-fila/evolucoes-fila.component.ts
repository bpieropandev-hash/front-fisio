import { Component, EventEmitter, Input, OnChanges, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { forkJoin, of, switchMap } from 'rxjs';
import { AgendamentoService } from '../../../core/services/agendamento.service';
import { ClinicaService } from '../../../core/services/clinica.service';
import { AtendimentoResponseDTO, AtendimentoUpdateRequestDTO } from '../../../core/interfaces/agendamento.interface';
import { ErrorHandlerUtil } from '../../../core/utils/error-handler.util';
import { formatDateForApi } from '../../../core/utils/date-format.util';
import { DateFieldComponent } from '../../../shared/components/date-field/date-field.component';
import { EvolucaoFichaComponent, EvolucaoFichaEstado } from '../../../shared/components/evolucao-ficha/evolucao-ficha.component';
import { ehMensalidade } from '../agenda-group.util';

export type AtendimentoFila = AtendimentoResponseDTO & { pacienteNome: string };

/** Um horário da agenda com atendimentos ainda sem conclusão (turma = vários participantes). */
export interface GrupoFila {
  chave: string;
  hora: string;
  fim: string;
  servicoNome: string;
  participantes: AtendimentoFila[];
}

const ESTADO_VAZIO: EvolucaoFichaEstado = { dirty: false, carregando: false, salvando: false, conflito: false, carregado: false, versao: 0, resumo: '' };

/**
 * Fila do dia: evolui, um horário por vez, os atendimentos que já aconteceram e ainda estão AGENDADOS.
 * Concluir = salvar a ficha (com versionamento próprio) + PUT de status CONCLUIDO, como no detalhe do atendimento.
 */
@Component({
  selector: 'app-evolucoes-fila',
  imports: [FormsModule, Dialog, Button, Select, DateFieldComponent, EvolucaoFichaComponent],
  templateUrl: './evolucoes-fila.component.html',
  styleUrl: './evolucoes-fila.component.scss'
})
export class EvolucoesFilaComponent implements OnChanges {
  /** Snapshot dos horários pendentes no momento em que a fila foi aberta. */
  @Input({ required: true }) grupos: GrupoFila[] = [];
  @Input() visivel = false;
  @Output() fechar = new EventEmitter<void>();
  /** Alguma conclusão foi gravada: a agenda deve recarregar. */
  @Output() atualizou = new EventEmitter<void>();
  @ViewChild(EvolucaoFichaComponent) private ficha?: EvolucaoFichaComponent;

  private readonly agendamento = inject(AgendamentoService);
  private readonly clinica = inject(ClinicaService);
  private readonly mensagens = inject(MessageService);

  readonly recebedorOptions = [{ label: 'Clínica', value: 'CLINICA' }, { label: 'Profissional', value: 'PROFISSIONAL' }];
  readonly tipoPagamentoOptions = [
    { label: 'Dinheiro', value: 'DINHEIRO' }, { label: 'Cartão de Crédito', value: 'CARTAO_CREDITO' },
    { label: 'Cartão de Débito', value: 'CARTAO_DEBITO' }, { label: 'PIX', value: 'PIX' }
  ];

  readonly concluidos = signal<ReadonlySet<number>>(new Set());
  readonly total = signal(0);
  readonly indice = signal(0);
  readonly aba = signal(0);
  readonly modo = signal<'mesmo' | 'cada'>('mesmo');
  readonly estado = signal<EvolucaoFichaEstado>(ESTADO_VAZIO);
  readonly salvando = signal(false);
  recebedor: 'CLINICA' | 'PROFISSIONAL' | null = null;
  tipoPagamento: AtendimentoUpdateRequestDTO['tipoPagamento'] | null = null;
  dataPagamento: Date | null = new Date();

  /** Horários com ao menos um participante ainda não concluído, na ordem da agenda. */
  readonly pendentes = computed(() => {
    const feitos = this.concluidos();
    return this.grupos
      .map(g => ({ ...g, participantes: g.participantes.filter(p => !feitos.has(p.id)) }))
      .filter(g => g.participantes.length > 0);
  });
  readonly atual = computed(() => this.pendentes()[Math.min(this.indice(), this.pendentes().length - 1)] ?? null);
  /** Quem recebe a evolução na tela: o escolhido na aba (um por paciente) ou o 1º da turma (mesmo registro). */
  readonly alvo = computed(() => {
    const g = this.atual();
    if (!g) return null;
    return g.participantes[this.modo() === 'cada' ? Math.min(this.aba(), g.participantes.length - 1) : 0];
  });
  readonly feitas = computed(() => this.concluidos().size);
  readonly percentual = computed(() => (this.total() ? Math.round((this.feitas() / this.total()) * 100) : 100));
  /** Recebimento só aparece quando a evolução vale para um único atendimento avulso. */
  readonly alvoAvulsoUnico = computed(() => {
    const g = this.atual(), a = this.alvo();
    return !!g && !!a && !ehMensalidade(a) && (g.participantes.length === 1 || this.modo() === 'cada');
  });

  ngOnChanges(): void {
    if (!this.visivel) return;
    this.concluidos.set(new Set());
    this.total.set(this.grupos.reduce((n, g) => n + g.participantes.length, 0));
    this.indice.set(0); this.aba.set(0); this.modo.set('mesmo'); this.estado.set(ESTADO_VAZIO); this.limparRecebimento();
  }

  rotuloTurma(g: GrupoFila): string { return g.participantes.length > 1 ? `${g.servicoNome} · ${g.participantes.length}` : g.participantes[0].pacienteNome.split(' ')[0]; }
  subtituloTurma(g: GrupoFila): string { return g.participantes.length > 1 ? g.participantes.map(p => p.pacienteNome.split(' ')[0]).join(', ') : g.servicoNome; }
  modalidade(a: AtendimentoFila): string { return ehMensalidade(a) ? 'mensalidade' : 'avulso'; }
  ehMensalidade = ehMensalidade;

  private limparRecebimento(): void { this.recebedor = null; this.tipoPagamento = null; this.dataPagamento = new Date(); }
  private avisar(severity: 'warn' | 'error' | 'success', summary: string, detail: string): void { this.mensagens.add({ severity, summary, detail }); }

  /** Trocar de horário/participante recarrega a ficha: com alterações não salvas, o usuário decide antes. */
  private podeTrocar(): boolean {
    if (this.salvando()) return false;
    if (this.estado().dirty) { this.avisar('warn', 'Evolução pendente', 'Salve a evolução (Concluir e próxima) antes de trocar de paciente.'); return false; }
    return true;
  }
  irPara(i: number): void { if (i !== this.indice() && this.podeTrocar()) { this.indice.set(i); this.aba.set(0); this.limparRecebimento(); } }
  escolherAba(i: number): void { if (i !== this.aba() && this.podeTrocar()) { this.aba.set(i); this.limparRecebimento(); } }
  mudarModo(m: 'mesmo' | 'cada'): void { if (m !== this.modo() && this.podeTrocar()) { this.modo.set(m); this.aba.set(0); this.limparRecebimento(); } }
  pular(): void { const n = this.pendentes().length; if (n > 1 && this.podeTrocar()) { this.indice.set((this.indice() + 1) % n); this.aba.set(0); this.limparRecebimento(); } }
  fecharFila(): void {
    if (this.salvando()) return;
    if (this.estado().dirty) { this.avisar('warn', 'Evolução pendente', 'Salve a evolução (Concluir e próxima) antes de fechar.'); return; }
    this.fechar.emit();
  }

  concluir(): void {
    const g = this.atual(), alvo = this.alvo(), ficha = this.ficha;
    if (!g || !alvo || !ficha || this.salvando()) return;
    const est = this.estado();
    if (est.carregando || !est.carregado) { this.avisar('warn', 'Atenção', 'Aguarde carregar a evolução antes de concluir.'); return; }
    if (est.conflito) { this.avisar('warn', 'Atenção', 'A evolução foi alterada por outro profissional. Recarregue a ficha antes de concluir.'); return; }
    if (this.alvoAvulsoUnico() && (this.recebedor || this.tipoPagamento) && (!this.recebedor || !this.tipoPagamento || !this.dataPagamento)) {
      this.avisar('warn', 'Recebimento incompleto', 'Informe recebedor, forma e data do recebimento para confirmar o pagamento.'); return;
    }
    if (est.dirty) {
      if (ficha.form.invalid) { ficha.form.markAllAsTouched(); this.avisar('warn', 'Atenção', 'Corrija os campos da evolução antes de concluir.'); return; }
      this.salvando.set(true);
      ficha.salvar();
      return; // continua em fichaSalva(); falha de salvar é exibida pela própria ficha
    }
    if (!est.resumo.trim()) { this.avisar('warn', 'Atenção', 'Evolução é obrigatória para concluir o atendimento'); return; }
    this.salvando.set(true);
    this.gravarConclusao();
  }

  fichaSalva(): void { if (this.salvando()) this.gravarConclusao(); }
  fichaEstado(e: EvolucaoFichaEstado): void {
    this.estado.set(e);
    // salvar falhou (ficha segue suja ou em conflito): libera a tela para tentar de novo
    if (this.salvando() && !e.salvando && (e.dirty || e.conflito)) this.salvando.set(false);
  }

  private gravarConclusao(): void {
    const g = this.atual(), alvo = this.alvo(), ficha = this.ficha;
    if (!g || !alvo || !ficha) { this.salvando.set(false); return; }
    const alvos = this.modo() === 'mesmo' ? g.participantes : [alvo];
    const valores = ficha.valores();
    // Mesmo registro: os demais recebem a ficha só se ainda não têm evolução (nunca sobrescreve a existente).
    const replicar = alvos.filter(a => a.id !== alvo.id).map(a => this.clinica.buscarEvolucao(a.id).pipe(
      switchMap(f => f.resumo?.trim() ? of(f) : this.clinica.salvarEvolucao(a.id, { ...valores, versao: f.versao }))));
    const concluir = (a: AtendimentoFila) => {
      const dto: AtendimentoUpdateRequestDTO = { status: 'CONCLUIDO' };
      if (this.alvoAvulsoUnico() && a.id === alvo.id && this.recebedor && this.tipoPagamento && this.dataPagamento) {
        dto.recebedor = this.recebedor; dto.tipoPagamento = this.tipoPagamento; dto.dataPagamento = formatDateForApi(this.dataPagamento);
      }
      return this.agendamento.atualizar(a.id, dto);
    };
    (replicar.length ? forkJoin(replicar) : of([])).pipe(switchMap(() => forkJoin(alvos.map(concluir)))).subscribe({
      next: () => {
        const feitos = new Set(this.concluidos()); alvos.forEach(a => feitos.add(a.id)); this.concluidos.set(feitos);
        this.salvando.set(false); this.estado.set(ESTADO_VAZIO); this.aba.set(0); this.limparRecebimento();
        this.indice.update(i => Math.min(i, Math.max(this.pendentes().length - 1, 0)));
        this.avisar('success', 'Evolução salva', alvos.length > 1 ? `${alvos.length} atendimentos concluídos` : `${alvo.pacienteNome.split(' ')[0]} concluído(a)`);
        this.atualizou.emit();
      },
      error: (error: HttpErrorResponse) => {
        const msg = ErrorHandlerUtil.getErrorMessage(error);
        this.avisar(msg.severity as 'warn' | 'error', msg.summary, msg.detail);
        this.salvando.set(false);
        this.atualizou.emit(); // parte pode ter sido gravada
      }
    });
  }
}
