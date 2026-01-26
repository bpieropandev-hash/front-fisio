import { Component, signal, OnDestroy } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    ToastModule
],
    providers: [MessageService],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      login: ['', Validators.required],
      senha: ['', Validators.required]
    });
    
    // Adiciona classe ao body para mudar o fundo
    document.body.classList.add('login-page');
  }

  ngOnDestroy(): void {
    // Remove a classe quando sair da página
    document.body.classList.remove('login-page');
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          // Redireciona para a URL salva ou para o dashboard
          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          const redirectTo = returnUrl || '/dashboard';
          this.router.navigateByUrl(redirectTo);
        },
        error: (error) => {
          this.loading.set(false);
          console.log('Erro de login:', error);
          console.log('Erro completo:', JSON.stringify(error, null, 2));
          
          // Prioriza "mensagem" (português) e depois "message" (inglês)
          const errorDetail = error.error?.mensagem || error.error?.message || 'Credenciais inválidas';
          
          console.log('Mensagem de erro extraída:', errorDetail);
          
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: errorDetail
          });
        }
      });
    }
  }
}


