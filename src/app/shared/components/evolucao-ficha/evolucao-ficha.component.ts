import { ConfiguracaoClinicaService } from '../../../core/services/configuracao-clinica.service';
import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ClinicaService } from '../../../core/services/clinica.service';
import { EquipamentoClinico, EvolucaoClinica, ProcedimentoClinico } from '../../../core/interfaces/clinica.interface';

function inteiroEntre(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => control.value === null || (Number.isInteger(control.value) && control.value >= min && control.value <= max) ? null : { intervalo: true };
}
function validarPressao(control: AbstractControl): ValidationErrors | null {
  if (!control.get('procedimentos')?.value.includes('PRESSAO_ARTERIAL')) return null;
  const sis = control.get('pressaoSistolica')?.value;
  const dia = control.get('pressaoDiastolica')?.value;
  return Number.isInteger(sis) && sis >= 40 && sis <= 300 && Number.isInteger(dia) && dia >= 20 && dia <= 200 && sis > dia ? null : { pressao: true };
}

export interface EvolucaoFichaEstado {
  dirty: boolean;
  carregando: boolean;
  salvando: boolean;
  conflito: boolean;
  carregado: boolean;
  versao: number;
  resumo: string;
}

@Component({
  selector: 'app-evolucao-ficha',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './evolucao-ficha.component.html',
  styleUrl: './evolucao-ficha.component.scss'
})
export class EvolucaoFichaComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) atendimentoId!: number;
  @Output() salva = new EventEmitter<string>();
  @Output() estadoAlterado = new EventEmitter<EvolucaoFichaEstado>();
  private readonly clinica = inject(ClinicaService);
  private requisicoes = new Subscription();
  private readonly alteracoes: Subscription;
  private versao = 0;
  private camposSalvos = '';
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly carregado = signal(false);
  readonly erro = signal('');
  readonly conflito = signal(false);
  readonly sucesso = signal('');
  readonly resumo = signal('');
  readonly autor = signal<string | null>(null);
  readonly atualizadoEm = signal<string | null>(null);
  readonly historico = signal<EvolucaoClinica[]>([]);
  readonly historicoAberto = signal(false);
  readonly carregandoHistorico = signal(false);
  readonly erroHistorico = signal('');
  readonly configuracoes = inject(ConfiguracaoClinicaService);
  get procedimentos() { return this.configuracoes.atual().procedimentos.filter(i=>i.ativo || this.form.controls.procedimentos.value.includes(i.codigo)); }
  get equipamentos() { return this.configuracoes.atual().equipamentos.filter(i=>i.ativo || this.form.controls.equipamentos.value.includes(i.codigo)); }
  readonly form = new FormGroup({
    procedimentos: new FormControl<ProcedimentoClinico[]>([], { nonNullable: true }),
    equipamentos: new FormControl<EquipamentoClinico[]>([], { nonNullable: true }),
    pressaoSistolica: new FormControl<number | null>(null),
    pressaoDiastolica: new FormControl<number | null>(null),
    dor: new FormControl<number | null>(null, inteiroEntre(0, 10)),
    observacoes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(5000)] })
  }, { validators: validarPressao });

  constructor() {
    this.alteracoes = new Subscription();
    this.alteracoes.add(this.form.controls.procedimentos.valueChanges.subscribe(codigos => {
      if (!codigos.includes('PRESSAO_ARTERIAL')) {
        this.form.patchValue({ pressaoSistolica: null, pressaoDiastolica: null }, { emitEvent: false });
      }
    }));
    this.alteracoes.add(this.form.valueChanges.subscribe(() => this.emitirEstado()));
  }
  ngOnChanges(): void { this.carregar(); }
  ngOnDestroy(): void { this.requisicoes.unsubscribe(); this.alteracoes.unsubscribe(); }

  carregar(): void {
    this.requisicoes.unsubscribe();
    this.requisicoes = new Subscription();
    this.form.reset({ procedimentos: [], equipamentos: [], pressaoSistolica: null, pressaoDiastolica: null, dor: null, observacoes: '' }, { emitEvent: false });
    this.camposSalvos = this.serializarCampos();
    this.resumo.set(''); this.autor.set(null); this.atualizadoEm.set(null); this.versao = 0;
    this.historico.set([]); this.historicoAberto.set(false); this.carregandoHistorico.set(false); this.erroHistorico.set('');
    this.erro.set(''); this.sucesso.set(''); this.conflito.set(false); this.salvando.set(false); this.carregado.set(false);
    if (!Number.isInteger(this.atendimentoId) || this.atendimentoId <= 0) { this.carregando.set(false); this.emitirEstado(); return; }
    this.carregando.set(true); this.emitirEstado();
    this.requisicoes.add(this.clinica.buscarEvolucao(this.atendimentoId).subscribe({
      next: ficha => { this.aplicar(ficha); this.carregado.set(true); this.carregando.set(false); this.emitirEstado(); },
      error: () => { this.erro.set('Não foi possível carregar a evolução. Tente novamente.'); this.carregando.set(false); this.emitirEstado(); }
    }));
  }
  private aplicar(ficha: EvolucaoClinica): void {
    this.versao = ficha.versao;
    this.form.reset({ procedimentos: ficha.procedimentos, equipamentos: ficha.equipamentos, pressaoSistolica: ficha.pressaoSistolica, pressaoDiastolica: ficha.pressaoDiastolica, dor: ficha.dor, observacoes: ficha.observacoes }, { emitEvent: false });
    this.camposSalvos = this.serializarCampos();
    this.resumo.set(ficha.resumo); this.autor.set(ficha.autor); this.atualizadoEm.set(ficha.atualizadoEm);
  }
  private serializarCampos(): string {
    const campos = this.form.getRawValue();
    return JSON.stringify({ ...campos, procedimentos: [...campos.procedimentos].sort(), equipamentos: [...campos.equipamentos].sort() });
  }
  private emitirEstado(): void {
    this.estadoAlterado.emit({
      dirty: this.carregado() && this.serializarCampos() !== this.camposSalvos,
      carregando: this.carregando(), salvando: this.salvando(), conflito: this.conflito(),
      carregado: this.carregado(), versao: this.versao, resumo: this.resumo()
    });
  }
  alternarProcedimento(codigo: ProcedimentoClinico): void { this.alternar(this.form.controls.procedimentos, codigo); }
  alternarEquipamento(codigo: EquipamentoClinico): void { this.alternar(this.form.controls.equipamentos, codigo); }
  private alternar<T extends string>(control: FormControl<T[]>, codigo: T): void {
    control.setValue(control.value.includes(codigo) ? control.value.filter(c => c !== codigo) : [...control.value, codigo]);
    control.markAsDirty();
  }
  salvar(): void {
    this.form.markAllAsTouched();
    if (!this.carregado() || this.form.invalid || this.salvando() || this.conflito()) return;
    this.salvando.set(true); this.erro.set(''); this.sucesso.set(''); this.emitirEstado();
    this.requisicoes.add(this.clinica.salvarEvolucao(this.atendimentoId, { versao: this.versao, ...this.form.getRawValue() }).subscribe({
      next: ficha => {
        this.aplicar(ficha); this.salvando.set(false); this.sucesso.set('Evolução salva.'); this.emitirEstado(); this.salva.emit(ficha.resumo);
        if (this.historicoAberto()) this.carregarHistorico();
      },
      error: (error: HttpErrorResponse) => {
        this.salvando.set(false);
        this.conflito.set(error.status === 409);
        this.erro.set(error.status === 409 ? 'A evolução foi alterada por outro profissional. Copie suas observações e recarregue a ficha para revisar a versão atual.' : 'Não foi possível salvar a evolução. Seu preenchimento foi mantido; tente novamente.');
        this.emitirEstado();
      }
    }));
  }
  carregarHistorico(): void {
    if (!this.carregado() || this.carregandoHistorico()) return;
    this.historicoAberto.set(true); this.carregandoHistorico.set(true); this.erroHistorico.set('');
    this.requisicoes.add(this.clinica.historicoEvolucao(this.atendimentoId).subscribe({
      next: revisoes => { this.historico.set(revisoes); this.carregandoHistorico.set(false); },
      error: () => { this.erroHistorico.set('Não foi possível carregar o histórico.'); this.carregandoHistorico.set(false); }
    }));
  }
}
