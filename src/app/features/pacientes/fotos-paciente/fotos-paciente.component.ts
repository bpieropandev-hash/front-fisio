import { ConfiguracaoClinicaService } from '../../../core/services/configuracao-clinica.service';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClinicaService } from '../../../core/services/clinica.service';
import { FotoClinica } from '../../../core/interfaces/clinica.interface';

function dataValida(control: AbstractControl) {
  const value: string = control.value;
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)) ? null : { data: true };
}

@Component({
  selector: 'app-fotos-paciente',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './fotos-paciente.component.html',
  styleUrl: './fotos-paciente.component.scss'
})
export class FotosPacienteComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) pacienteId!: number;
  @Input() pacienteNome = '';
  @ViewChild('arquivoInput') private arquivoInput?: ElementRef<HTMLInputElement>;
  readonly configuracoes = inject(ConfiguracaoClinicaService);
  private readonly clinica = inject(ClinicaService);
  private requisicoes = new Subscription();
  private arquivo: File | null = null;
  readonly fotos = signal<FotoClinica[]>([]);
  readonly urls = signal<Record<number, string>>({});
  readonly errosImagem = signal<Record<number, boolean>>({});
  readonly selecionadas = signal<number[]>([]);
  readonly comparacao = computed(() => this.selecionadas().map(id => this.fotos().find(foto => foto.id === id)).filter((foto): foto is FotoClinica => !!foto));
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly carregado = signal(false);
  readonly excluindo = signal(false);
  readonly exclusao = signal<FotoClinica | null>(null);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly nomeArquivo = signal('');
  readonly form = new FormGroup({
    dataCaptura: new FormControl('', { nonNullable: true, validators: [Validators.required, dataValida] }),
    regiao: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)] }),
    observacao: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] })
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['pacienteId']) return;
    this.form.reset(); this.limparArquivo(); this.sucesso.set('');
    this.carregar();
  }
  ngOnDestroy(): void { this.requisicoes.unsubscribe(); this.revogarImagens(); }
  private revogarImagens(): void {
    Object.values(this.urls()).forEach(url => URL.revokeObjectURL(url));
    this.urls.set({});
  }
  carregar(): void {
    this.requisicoes.unsubscribe(); this.requisicoes = new Subscription();
    this.revogarImagens(); this.errosImagem.set({}); this.fotos.set([]); this.selecionadas.set([]); this.exclusao.set(null);
    this.erro.set(''); this.enviando.set(false); this.excluindo.set(false); this.carregado.set(false);
    if (!Number.isInteger(this.pacienteId) || this.pacienteId <= 0) { this.carregando.set(false); return; }
    this.carregando.set(true);
    this.requisicoes.add(this.clinica.listarFotos(this.pacienteId).subscribe({
      next: fotos => {
        this.fotos.set(fotos); this.carregando.set(false); this.carregado.set(true);
        fotos.forEach(foto => this.carregarImagem(foto));
      },
      error: () => { this.erro.set('Não foi possível carregar as fotos. Tente novamente.'); this.carregando.set(false); }
    }));
  }
  carregarImagem(foto: FotoClinica): void {
    this.errosImagem.update(erros => ({ ...erros, [foto.id]: false }));
    this.requisicoes.add(this.clinica.imagemFoto(this.pacienteId, foto.id).subscribe({
      next: blob => {
        const anterior = this.urls()[foto.id];
        if (anterior) URL.revokeObjectURL(anterior);
        this.urls.update(urls => ({ ...urls, [foto.id]: URL.createObjectURL(blob) }));
      },
      error: () => this.errosImagem.update(erros => ({ ...erros, [foto.id]: true }))
    }));
  }
  selecionarComparacao(id: number): void {
    if (!this.fotos().some(foto => foto.id === id)) return;
    this.selecionadas.update(ids => ids.includes(id) ? ids.filter(atual => atual !== id) : ids.length < 2 ? [...ids, id] : ids);
  }
  selecionarArquivo(event: Event): void {
    this.arquivo = null; this.nomeArquivo.set(''); this.erro.set(''); this.sucesso.set('');
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > this.configuracoes.atual().fotoLimiteMiB * 1024 * 1024) {
      this.erro.set(`Selecione uma imagem JPEG ou PNG de até ${this.configuracoes.atual().fotoLimiteMiB} MiB.`);
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
    if (!this.arquivo || this.form.invalid) { this.erro.set('Selecione uma imagem JPEG ou PNG dentro do limite configurado, a data da captura e a região corporal.'); return; }
    this.enviando.set(true); this.erro.set(''); this.sucesso.set('');
    const dados = this.form.getRawValue();
    this.requisicoes.add(this.clinica.enviarFoto(this.pacienteId, { imagem: this.arquivo, ...dados, regiao: dados.regiao.trim(), observacao: dados.observacao.trim() }).subscribe({
      next: () => { this.form.reset(); this.limparArquivo(); this.sucesso.set('Foto enviada.'); this.carregar(); },
      error: () => { this.enviando.set(false); this.erro.set('Não foi possível enviar a foto. Verifique se é uma imagem JPEG ou PNG válida dentro do limite configurado e tente novamente.'); }
    }));
  }
  pedirExclusao(foto: FotoClinica): void { if (!this.enviando() && !this.excluindo()) { this.exclusao.set(foto); this.erro.set(''); } }
  confirmarExclusao(): void {
    const foto = this.exclusao();
    if (!foto || this.excluindo()) return;
    this.excluindo.set(true); this.erro.set(''); this.sucesso.set('');
    this.requisicoes.add(this.clinica.excluirFoto(this.pacienteId, foto.id).subscribe({
      next: () => { this.sucesso.set('Foto excluída.'); this.carregar(); },
      error: () => { this.excluindo.set(false); this.erro.set('Não foi possível excluir a foto. Tente novamente.'); }
    }));
  }
}
