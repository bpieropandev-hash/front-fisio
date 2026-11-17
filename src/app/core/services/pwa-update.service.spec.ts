import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let versionUpdates: Subject<unknown>;
  let sw: { isEnabled: boolean; versionUpdates: Subject<unknown>; unrecoverable: Subject<unknown>; checkForUpdate: ReturnType<typeof vi.fn>; activateUpdate: ReturnType<typeof vi.fn> };
  let service: PwaUpdateService;
  let recarregar: ReturnType<typeof vi.fn<() => void>>;

  function criar(enabled = true) {
    versionUpdates = new Subject();
    sw = { isEnabled: enabled, versionUpdates, unrecoverable: new Subject(), checkForUpdate: vi.fn().mockResolvedValue(false), activateUpdate: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({ providers: [{ provide: SwUpdate, useValue: sw }] });
    service = TestBed.inject(PwaUpdateService);
    recarregar = vi.fn<() => void>();
    (service as unknown as { recarregar: () => void }).recarregar = recarregar;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('não faz nada quando o service worker está desabilitado (dev)', () => {
    criar(false);
    service.iniciar();
    expect(sw.checkForUpdate).not.toHaveBeenCalled();
  });

  it('checa ao iniciar e liga o aviso quando o SW reporta VERSION_READY', () => {
    criar();
    service.iniciar();
    expect(sw.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(service.atualizacaoDisponivel()).toBe(false);
    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(service.atualizacaoDisponivel()).toBe(false);
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.atualizacaoDisponivel()).toBe(true);
  });

  it('liga o aviso quando checkForUpdate retorna true mesmo sem evento', async () => {
    criar();
    sw.checkForUpdate.mockResolvedValue(true);
    await service.verificar();
    expect(service.atualizacaoDisponivel()).toBe(true);
  });

  it('checkForUpdate rejeitado (offline) não quebra nem liga o aviso', async () => {
    criar();
    sw.checkForUpdate.mockRejectedValue(new Error('offline'));
    await expect(service.verificar()).resolves.toBeUndefined();
    expect(service.atualizacaoDisponivel()).toBe(false);
  });

  it('checa de novo ao voltar para o app (visibilitychange)', () => {
    criar();
    service.iniciar();
    sw.checkForUpdate.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sw.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('aplicar ativa a versão e recarrega, mesmo se activateUpdate falhar', async () => {
    criar();
    await service.aplicar();
    expect(sw.activateUpdate).toHaveBeenCalled();
    expect(recarregar).toHaveBeenCalledTimes(1);
    TestBed.resetTestingModule();
    criar();
    sw.activateUpdate.mockRejectedValue(new Error('sem cliente'));
    await service.aplicar();
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('estado irrecuperável recarrega a página', () => {
    criar();
    service.iniciar();
    sw.unrecoverable.next({});
    expect(recarregar).toHaveBeenCalledTimes(1);
  });
});
