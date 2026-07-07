import { Component, signal, OnDestroy } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-esqueci-senha',
    imports: [ReactiveFormsModule, ButtonModule, ToastModule],
    providers: [MessageService],
    templateUrl: './esqueci-senha.component.html',
    styleUrls: ['../login/login.component.scss', './esqueci-senha.component.scss']
})
export class EsqueciSenhaComponent implements OnDestroy {
  form: FormGroup;
  loading = signal(false);
  enviado = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      loginOuEmail: ['', Validators.required]
    });

    document.body.classList.add('login-page');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('login-page');
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.authService.esqueciSenha(this.form.value.loginOuEmail).subscribe({
      next: () => {
        this.loading.set(false);
        this.enviado.set(true);
      },
      error: () => {
        // Backend sempre responde 200; erro aqui é falha de rede/servidor, não credencial
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível processar a solicitação. Tente novamente.'
        });
      }
    });
  }

  voltarParaLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
