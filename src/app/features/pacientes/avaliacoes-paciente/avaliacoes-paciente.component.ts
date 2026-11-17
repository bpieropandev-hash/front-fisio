import { DateInputDirective } from '../../../shared/directives/date-input.directive';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClinicaService } from '../../../core/services/clinica.service';
import { AvaliacaoFisica } from '../../../core/interfaces/clinica.interface';

export const LIMITE_AVALIACAO_MIB = 10;
const TIPOS_AVALIACAO = ['image/jpeg', 'image/png', 'application/pdf'];

function dataValida(control: AbstractControl) {
  const value: string = control.value;
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)) ? null : { data: true };
}

@Component({
  selector: 'app-avaliacoes-paciente',
  imports: [DateInputDirective, ReactiveFormsModule, DatePipe],
  templateUrl: './avaliacoes-paciente.component.html',
  styleUrl: './avaliacoes-paciente.component.scss'
})
export class AvaliacoesPacienteComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) pacienteId!: number;
  @Input() pacienteNome = '';
  @ViewChild('arquivoInput') private arquivoInput?: ElementRef<HTMLInputElement>;
  private readonly clinica = inject(ClinicaService);
  private requisicoes = new Subscription();
  private arquivo: File | null = null;
  readonly limiteMiB = LIMITE_AVALIACAO_MIB;
  readonly avaliacoes = signal<AvaliacaoFisica[]>([]);
  readonly carregando = signal(false);
  readonly carregado = signal(false);
  readonly enviando = signal(false);
  readonly excluindo = signal(false);
  readonly abrindoId = signal<number | null>(null);
  readonly exclusao = signal<AvaliacaoFisica | null>(null);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly nomeArquivo = signal('');
  readonly form = new FormGroup({
    dataAvaliacao: new FormControl('', { nonNullable: true, validators: [Validators.required, dataValida] }),
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)] }),
    observacao: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] })
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['pacienteId']) return;
    this.form.reset(); this.limparArquivo(); this.sucesso.set('');
    this.carregar();
  }
  ngOnDestroy(): void { this.requisicoes.unsubscribe(); }

  carregar(): void {
    this.requisicoes.unsubscribe(); this.requisicoes = new Subscription();
    this.avaliacoes.set([]); this.exclusao.set(null); this.erro.set('');
    this.enviando.set(false); this.excluindo.set(false); this.abrindoId.set(null); this.carregado.set(false);
    if (!Number.isInteger(this.pacienteId) || this.pacienteId <= 0) { this.carregando.set(false); return; }
    this.carregando.set(true);
    this.requisicoes.add(this.clinica.listarAvaliacoes(this.pacienteId).subscribe({
      next: lista => { this.avaliacoes.set(lista); this.carregando.set(false); this.carregado.set(true); },
      error: () => { this.erro.set('Não foi possível carregar as avaliações. Tente novamente.'); this.carregando.set(false); }
    }));
  }

  ehPdf(item: AvaliacaoFisica): boolean { return item.tipoConteudo === 'application/pdf'; }

  selecionarArquivo(event: Event): void {
    this.arquivo = null; this.nomeArquivo.set(''); this.erro.set(''); this.sucesso.set('');
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!TIPOS_AVALIACAO.includes(file.type) || file.size === 0 || file.size > this.limiteMiB * 1024 * 1024) {
      this.erro.set(`Selecione uma imagem JPEG, PNG ou um PDF de até ${this.limiteMiB} MiB.`);
      if (this.arquivoInput) this.arquivoInput.nativeElement.value = '';
      return;
    }
    this.arquivo = file; this.nomeArquivo.set(file.name);
  }
  private limparArquivo(): void {
    this.arquivo = null; this.nomeArquivo.set('');
    if (this.arquivoInput) this.arquivoInput.nativeElement.value = '';
  }

  enviar(): void {
    if (this.enviando() || this.carregando() || this.excluindo() || !this.carregado()) return;
    this.form.markAllAsTouched();
    if (!this.arquivo || this.form.invalid) { this.erro.set(`Selecione o arquivo (imagem ou PDF de até ${this.limiteMiB} MiB), a data e o título da avaliação.`); return; }
    this.enviando.set(true); this.erro.set(''); this.sucesso.set('');
    const dados = this.form.getRawValue();
    this.requisicoes.add(this.clinica.enviarAvaliacao(this.pacienteId, { arquivo: this.arquivo, ...dados, titulo: dados.titulo.trim(), observacao: dados.observacao.trim() }).subscribe({
      next: () => { this.form.reset(); this.limparArquivo(); this.sucesso.set('Avaliação enviada.'); this.carregar(); },
      error: () => { this.enviando.set(false); this.erro.set(`Não foi possível enviar a avaliação. Verifique se o arquivo é imagem JPEG/PNG ou PDF válido de até ${this.limiteMiB} MiB e tente novamente.`); }
    }));
  }

  /** Abre o arquivo privado em outra aba. A aba é aberta no clique (antes do download) para o navegador não bloquear o pop-up. */
  abrir(item: AvaliacaoFisica): void {
    if (this.abrindoId() !== null) return;
    this.erro.set(''); this.abrindoId.set(item.id);
    const aba = window.open('', '_blank');
    this.requisicoes.add(this.clinica.arquivoAvaliacao(this.pacienteId, item.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        if (aba) { aba.location.href = url; } else { this.baixar(url, item.nomeArquivo); }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.abrindoId.set(null);
      },
      error: () => { aba?.close(); this.abrindoId.set(null); this.erro.set('Não foi possível abrir o arquivo. Tente novamente.'); }
    }));
  }
  private baixar(url: string, nome: string): void {
    const a = document.createElement('a');
    a.href = url; a.download = nome; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  pedirExclusao(item: AvaliacaoFisica): void { if (!this.enviando() && !this.excluindo()) { this.exclusao.set(item); this.erro.set(''); } }
  confirmarExclusao(): void {
    const item = this.exclusao();
    if (!item || this.excluindo()) return;
    this.excluindo.set(true); this.erro.set(''); this.sucesso.set('');
    this.requisicoes.add(this.clinica.excluirAvaliacao(this.pacienteId, item.id).subscribe({
      next: () => { this.sucesso.set('Avaliação excluída.'); this.carregar(); },
      error: () => { this.excluindo.set(false); this.erro.set('Não foi possível excluir a avaliação. Tente novamente.'); }
    }));
  }
}
