import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { DateFieldComponent } from './date-field.component';

@Component({
  imports: [DateFieldComponent, ReactiveFormsModule],
  template: `<app-date-field [formControl]="dia" inputId="dia" /><app-date-field [formControl]="mes" modo="mes" inputId="mes" />`
})
class HostComponent {
  dia = new FormControl<Date | null>(null);
  mes = new FormControl<Date | null>(null);
}

function montar() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const dia = el.querySelector('#dia') as HTMLInputElement;
  const mes = el.querySelector('#mes') as HTMLInputElement;
  const digitar = (campo: HTMLInputElement, texto: string) => {
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, dia, mes, digitar };
}

describe('DateFieldComponent', () => {
  it('mascara dd/mm/aaaa enquanto digita e entrega Date local', () => {
    const { host, dia, digitar } = montar();
    digitar(dia, '17112026');
    expect(dia.value).toBe('17/11/2026');
    const valor = host.dia.value!;
    expect([valor.getFullYear(), valor.getMonth(), valor.getDate()]).toEqual([2026, 10, 17]);
  });

  it('texto incompleto mantém o modelo nulo sem marcar erro', () => {
    const { host, dia, digitar } = montar();
    digitar(dia, '1711');
    expect(dia.value).toBe('17/11');
    expect(host.dia.value).toBeNull();
    expect(dia.getAttribute('aria-invalid')).toBeNull();
  });

  it('data inexistente (31/02/2026) vira nulo e marca erro', () => {
    const { host, dia, digitar } = montar();
    digitar(dia, '31022026');
    expect(host.dia.value).toBeNull();
    expect(dia.getAttribute('aria-invalid')).toBe('true');
  });

  it('apagar o campo limpa o modelo', () => {
    const { host, dia, digitar } = montar();
    digitar(dia, '17112026');
    digitar(dia, '');
    expect(host.dia.value).toBeNull();
  });

  it('writeValue aceita Date e string ISO', () => {
    const { fixture, host, dia } = montar();
    host.dia.setValue(new Date(2026, 0, 5));
    fixture.detectChanges();
    expect(dia.value).toBe('05/01/2026');
    host.dia.setValue('2026-03-09' as unknown as Date);
    fixture.detectChanges();
    expect(dia.value).toBe('09/03/2026');
    host.dia.setValue(null);
    fixture.detectChanges();
    expect(dia.value).toBe('');
  });

  it('modo mês usa mm/aaaa e devolve o dia 1', () => {
    const { host, mes, digitar } = montar();
    digitar(mes, '112026');
    expect(mes.value).toBe('11/2026');
    const valor = host.mes.value!;
    expect([valor.getFullYear(), valor.getMonth(), valor.getDate()]).toEqual([2026, 10, 1]);
    digitar(mes, '132026');
    expect(host.mes.value).toBeNull();
    expect(mes.getAttribute('aria-invalid')).toBe('true');
  });

  it('respeita desabilitado', () => {
    const { fixture, host, dia } = montar();
    host.dia.disable();
    fixture.detectChanges();
    expect(dia.disabled).toBe(true);
  });
});
