import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Converte o que o formulário guarda (Date ou yyyy-MM-dd) em Date local, ou null se não for uma data válida. */
function paraData(valor: unknown): Date | null {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (m) return montar(+m[1], +m[2], +m[3]);
  }
  return null;
}

/** Date local à meia-noite; null quando o dia/mês não existe (ex.: 31/02). */
function montar(ano: number, mes: number, dia: number): Date | null {
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}

/**
 * Campo de data digitável (dd/mm/aaaa, ou mm/aaaa em modo "mes") com máscara automática.
 * Substitui o calendário em pop-up: o modelo continua sendo `Date | null`, então ngModel e
 * formControlName funcionam como no antigo p-datepicker. Texto incompleto ou inexistente vira `null`.
 */
@Component({
  selector: 'app-date-field',
  template: `
    <input
      class="p-inputtext p-component date-field__input"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      [attr.id]="inputId() || null"
      [attr.maxlength]="modo() === 'mes' ? 7 : 10"
      [attr.placeholder]="placeholder() || (modo() === 'mes' ? 'mm/aaaa' : 'dd/mm/aaaa')"
      [attr.aria-invalid]="invalido() ? 'true' : null"
      [attr.title]="modo() === 'mes' ? 'Digite o mês no formato mm/aaaa' : 'Digite a data no formato dd/mm/aaaa'"
      [disabled]="desabilitado()"
      [value]="texto()"
      (input)="aoDigitar($event)"
      (blur)="aoSair()"
    />
  `,
  styles: [`
    :host { display: block; width: 100%; max-width: 100%; }
    .date-field__input { width: 100%; min-height: 44px; box-sizing: border-box; }
    .date-field__input[aria-invalid='true'] { border-color: var(--status-err-fg); }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true }]
})
export class DateFieldComponent implements ControlValueAccessor {
  readonly modo = input<'dia' | 'mes'>('dia');
  readonly inputId = input<string>('');
  readonly placeholder = input<string>('');

  readonly texto = signal('');
  readonly invalido = signal(false);
  readonly desabilitado = signal(false);

  private onChange: (valor: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: unknown): void {
    const data = paraData(valor);
    this.texto.set(data ? this.formatar(data) : '');
    this.invalido.set(false);
  }
  registerOnChange(fn: (valor: Date | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(desabilitado: boolean): void { this.desabilitado.set(desabilitado); }

  aoDigitar(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const exibido = this.mascarar(campo.value);
    campo.value = exibido;
    this.texto.set(exibido);
    const data = this.interpretar(exibido);
    // Só marca erro quando o texto está completo; enquanto digita, o modelo fica null sem alarde.
    this.invalido.set(exibido.length === campo.maxLength && !data);
    this.onChange(data);
  }

  aoSair(): void {
    // Ao sair com texto parcial (ex.: "12/0"), sinaliza erro em vez de aceitar em silêncio.
    if (this.texto() && !this.interpretar(this.texto())) this.invalido.set(true);
    this.onTouched();
  }

  private mascarar(bruto: string): string {
    const digitos = bruto.replace(/\D/g, '');
    if (this.modo() === 'mes') return digitos.slice(0, 6).replace(/^(\d{2})(\d)/, '$1/$2');
    return digitos.slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
  }

  private interpretar(texto: string): Date | null {
    if (this.modo() === 'mes') {
      const m = /^(\d{2})\/(\d{4})$/.exec(texto);
      return m ? montar(+m[2], +m[1], 1) : null;
    }
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    return m ? montar(+m[3], +m[2], +m[1]) : null;
  }

  private formatar(data: Date): string {
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const aaaa = String(data.getFullYear()).padStart(4, '0');
    if (this.modo() === 'mes') return `${mm}/${aaaa}`;
    return `${String(data.getDate()).padStart(2, '0')}/${mm}/${aaaa}`;
  }
}
