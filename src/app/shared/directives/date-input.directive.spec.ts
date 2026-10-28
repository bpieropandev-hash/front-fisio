import { DateInputDirective } from './date-input.directive';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, it, expect } from 'vitest';

@Component({standalone:true, imports:[FormsModule, DateInputDirective], template:'<input appDateInput [(ngModel)]="value">'})
class Host { value = '2026-10-28'; }

describe('Digitação de data', () => {
 it('permite digitar data brasileira e mantém o contrato ISO', async () => {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges(); await fixture.whenStable();
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
  expect(input.type).toBe('text');
  expect(input.value).toBe('28/10/2026');
  input.value='29/10/2026'; input.dispatchEvent(new Event('input'));
  expect(fixture.componentInstance.value).toBe('2026-10-29');
 });
 it('rejeita datas impossíveis sem normalizá-las nem tratá-las como vazias', async () => {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges(); await fixture.whenStable();
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
  for (const value of ['31/02/2026', '29/02/2025', '12/']) {
   input.value=value; input.dispatchEvent(new Event('input')); fixture.detectChanges();
   expect(input.classList.contains('ng-invalid')).toBe(true);
   expect(fixture.componentInstance.value).not.toBe('');
  }
  input.value='29022024'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
  expect(fixture.componentInstance.value).toBe('2024-02-29');
  expect(input.classList.contains('ng-valid')).toBe(true);
  input.value=''; input.dispatchEvent(new Event('input'));
  expect(fixture.componentInstance.value).toBe('');
 });
});
