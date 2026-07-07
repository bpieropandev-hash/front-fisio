import { Component, signal, OnInit, OnDestroy } from '@angular/core';

import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/services/auth.service';

function senhasIguaisValidator(control: AbstractControl): ValidationErrors | null {
  const novaSenha = control.get('novaSenha')?.value;
  const confirmarSenha = control.get('confirmarSenha')?.value;
  return novaSenha === confirmarSenha ? null : { senhasDiferentes: true };
}

@Component({
    selector: 'app-redefinir-senha',
    imports: [ReactiveFormsModule, ButtonModule, ToastModule],
    providers: [MessageService],
    templateUrl: './redefinir-senha.component.html',
    styleUrls: ['../login/login.component.scss', '../esqueci-senha/esqueci-senha.component.scss']
})
export class RedefinirSenhaComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = signal(false);
  sucesso = signal(false);
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      novaSenha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', Validators.required]
    }, { validators: senhasIguaisValidator });

    document.body.classList.add('login-page');
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || null;
    if (!this.token) {
      this.messageService.add({
        severity: 'error',
        summary: 'Link inválido',
        detail: 'Token de redefinição ausente. Solicite um novo link.'
      });
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('login-page');
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) return;

    this.loading.set(true);
    this.authService.redefinirSenha(this.token, this.form.value.novaSenha).subscribe({
      next: () => {
        this.loading.set(false);
        this.sucesso.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        const errorDetail = error.error?.mensagem || error.error?.message || 'Token inválido ou expirado';
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: errorDetail
        });
      }
    });
  }

  irParaLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
