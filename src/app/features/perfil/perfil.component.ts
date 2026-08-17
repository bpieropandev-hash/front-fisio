import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioService } from '../../core/services/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { AccentThemeService } from '../../core/services/accent-theme.service';
import { UsuarioMeResponseDTO, FonteTema, TamanhoFonte } from '../../core/interfaces/usuario.interface';
import { ErrorHandlerUtil } from '../../core/utils/error-handler.util';

function senhasIguaisValidator(control: AbstractControl): ValidationErrors | null {
  const novaSenha = control.get('novaSenha')?.value;
  const confirmarSenha = control.get('confirmarSenha')?.value;
  return novaSenha === confirmarSenha ? null : { senhasDiferentes: true };
}

@Component({
    selector: 'app-perfil',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, CardModule, ToastModule],
    providers: [MessageService],
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  carregando = signal(true);
  salvandoPerfil = signal(false);
  salvandoFoto = signal(false);
  salvandoSenha = signal(false);
  usuario = signal<UsuarioMeResponseDTO | null>(null);

  perfilForm: FormGroup;
  senhaForm: FormGroup;

  opcoesFonte: { label: string; value: FonteTema }[];
  opcoesTamanhoFonte: { label: string; value: TamanhoFonte }[];
  private loginAnterior: string | null = null;
  private corAnterior: string | null = null;
  private fonteAnterior: FonteTema | null = null;
  private tamanhoAnterior: TamanhoFonte | null = null;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private accentThemeService: AccentThemeService,
    private messageService: MessageService
  ) {
    this.opcoesFonte = this.accentThemeService.listarOpcoesFonte();
    this.opcoesTamanhoFonte = this.accentThemeService.listarOpcoesTamanhoFonte();

    this.perfilForm = this.fb.group({
      login: ['', Validators.required],
      nome: [''],
      telefone: [''],
      email: ['', Validators.email],
      corPrimaria: [null as string | null],
      fonteTema: [null as FonteTema | null],
      tamanhoFonte: [null as TamanhoFonte | null]
    });

    this.senhaForm = this.fb.group({
      senhaAtual: ['', Validators.required],
      novaSenha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', Validators.required]
    }, { validators: senhasIguaisValidator });
  }

  ngOnInit(): void {
    this.carregarPerfil();
  }

  carregarPerfil(): void {
    this.carregando.set(true);
    this.usuarioService.buscarMe().subscribe({
      next: (dados) => {
        this.usuario.set(dados);
        this.loginAnterior = dados.login;
        this.corAnterior = dados.corPrimaria;
        this.fonteAnterior = dados.fonteTema;
        this.tamanhoAnterior = dados.tamanhoFonte;
        this.perfilForm.patchValue({
          login: dados.login,
          nome: dados.nome,
          telefone: dados.telefone,
          email: dados.email,
          corPrimaria: dados.corPrimaria,
          fonteTema: dados.fonteTema,
          tamanhoFonte: dados.tamanhoFonte
        });
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.carregando.set(false);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }

  salvarPerfil(): void {
    if (this.perfilForm.invalid) return;

    this.salvandoPerfil.set(true);
    const loginMudou = this.perfilForm.value.login !== this.loginAnterior;

    this.usuarioService.atualizarMe(this.perfilForm.value).subscribe({
      next: (dados) => {
        this.usuario.set(dados);
        this.loginAnterior = dados.login;
        this.corAnterior = dados.corPrimaria;
        this.fonteAnterior = dados.fonteTema;
        this.tamanhoAnterior = dados.tamanhoFonte;
        this.salvandoPerfil.set(false);

        if (loginMudou) {
          this.messageService.add({
            severity: 'success',
            summary: 'Login alterado',
            detail: 'Faça login novamente com seu novo login.'
          });
          setTimeout(() => this.authService.logout(), 1500);
        } else {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Perfil atualizado' });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.salvandoPerfil.set(false);
        // Preview ao vivo não foi persistido — reverte o tema pro último valor salvo
        this.accentThemeService.aplicarCor(this.corAnterior);
        this.accentThemeService.aplicarFonte(this.fonteAnterior);
        this.accentThemeService.aplicarTamanhoFonte(this.tamanhoAnterior);
        this.perfilForm.patchValue({
          corPrimaria: this.corAnterior,
          fonteTema: this.fonteAnterior,
          tamanhoFonte: this.tamanhoAnterior
        });
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }

  aoMudarCor(hex: string): void {
    this.perfilForm.patchValue({ corPrimaria: hex });
    this.accentThemeService.aplicarCor(hex);
  }

  aoMudarFonte(fonte: FonteTema): void {
    this.perfilForm.patchValue({ fonteTema: fonte });
    this.accentThemeService.aplicarFonte(fonte);
  }

  aoMudarTamanhoFonte(tamanho: TamanhoFonte): void {
    this.perfilForm.patchValue({ tamanhoFonte: tamanho });
    this.accentThemeService.aplicarTamanhoFonte(tamanho);
  }

  aoSelecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      const fotoBase64 = leitor.result as string;
      this.salvandoFoto.set(true);
      this.usuarioService.atualizarFoto(fotoBase64).subscribe({
        next: (dados) => {
          this.usuario.set(dados);
          this.salvandoFoto.set(false);
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Foto atualizada' });
        },
        error: (error: HttpErrorResponse) => {
          this.salvandoFoto.set(false);
          const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
          this.messageService.add({
            severity: errorMessage.severity,
            summary: errorMessage.summary,
            detail: errorMessage.detail
          });
        }
      });
    };
    leitor.readAsDataURL(arquivo);
  }

  alterarSenha(): void {
    if (this.senhaForm.invalid) return;

    this.salvandoSenha.set(true);
    const { senhaAtual, novaSenha } = this.senhaForm.value;
    this.authService.alterarSenha(senhaAtual, novaSenha).subscribe({
      next: () => {
        this.salvandoSenha.set(false);
        this.senhaForm.reset();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Senha alterada' });
      },
      error: (error: HttpErrorResponse) => {
        this.salvandoSenha.set(false);
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        this.messageService.add({
          severity: errorMessage.severity,
          summary: errorMessage.summary,
          detail: errorMessage.detail
        });
      }
    });
  }
}
