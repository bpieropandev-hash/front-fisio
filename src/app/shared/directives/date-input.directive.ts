import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, Validator } from '@angular/forms';

/** Data local digitável; o formulário e a API continuam usando yyyy-MM-dd. */
@Directive({
  selector: 'input[appDateInput]',
  standalone: true,
  host: {
    'type': 'text', 'inputmode': 'numeric', 'placeholder': 'dd/mm/aaaa',
    'maxlength': '10', 'title': 'Digite a data no formato dd/mm/aaaa',
    '(input)': 'input()', '(blur)': 'onTouched()'
  },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateInputDirective), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateInputDirective), multi: true }
  ]
})
export class DateInputDirective implements ControlValueAccessor, Validator {
  private element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private invalid = false;
  private onChange: (value: string) => void = () => {};
  onTouched = () => {};
  writeValue(value: string | null): void {
    this.element.nativeElement.value = value?.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1') || '';
    this.invalid = false;
  }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.element.nativeElement.disabled = disabled; }
  validate() { return this.invalid ? { date: true } : null; }
  input(): void {
    const raw = this.element.nativeElement.value;
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const display = digits.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
    this.element.nativeElement.value = display;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
    const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
    const date = new Date(`${iso}T12:00:00`);
    this.invalid = !!display && (!match || !Number.isFinite(date.getTime()) || date.getFullYear() !== +match[3] || date.getMonth() + 1 !== +match[2] || date.getDate() !== +match[1]);
    // Preserve invalid non-empty input so optional date fields cannot default to today.
    this.onChange(this.invalid ? display : iso);
  }
}
