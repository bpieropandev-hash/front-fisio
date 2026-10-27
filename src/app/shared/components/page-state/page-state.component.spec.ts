import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PageStateComponent } from './page-state.component';

describe('PageStateComponent', () => {
 it('prioriza carregamento e erro antes do vazio e emite nova tentativa', async () => {
  await TestBed.configureTestingModule({imports:[PageStateComponent]}).compileComponents();
  const fixture=TestBed.createComponent(PageStateComponent);
  fixture.componentRef.setInput('empty',true);
  fixture.componentRef.setInput('error','Falha de conexão');
  fixture.componentRef.setInput('loading',true);fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  expect(fixture.nativeElement.textContent).not.toContain('Nenhum registro');
  fixture.componentRef.setInput('loading',false);fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Falha de conexão');
  const retry=vi.fn();fixture.componentInstance.retry.subscribe(retry);
  fixture.nativeElement.querySelector('button').click();expect(retry).toHaveBeenCalledOnce();
  fixture.componentRef.setInput('error','');fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Nenhum registro encontrado');
 });
});
