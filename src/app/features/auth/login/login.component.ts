import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="login-container">
      <div class="background">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
        <h3>Login</h3>

        <label for="login">Login</label>
        <input
          id="login"
          type="text"
          formControlName="login"
          placeholder="Digite seu login"
          [class.ng-invalid]="loginForm.get('login')?.invalid && loginForm.get('login')?.touched"
        />
        @if (loginForm.get('login')?.invalid && loginForm.get('login')?.touched) {
          <small class="error-text">Login é obrigatório</small>
        }

        <label for="senha">Senha</label>
        <input
          id="senha"
          type="password"
          formControlName="senha"
          placeholder="Digite sua senha"
          [class.ng-invalid]="loginForm.get('senha')?.invalid && loginForm.get('senha')?.touched"
        />
        @if (loginForm.get('senha')?.invalid && loginForm.get('senha')?.touched) {
          <small class="error-text">Senha é obrigatória</small>
        }

        <button type="submit" [disabled]="loginForm.invalid || loading()">
          @if (loading()) {
            <span>Entrando...</span>
          } @else {
            <span>Entrar</span>
          }
        </button>
      </form>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      overflow: hidden;
    }

    .background {
      width: 430px;
      height: 520px;
      position: absolute;
      transform: translate(-50%, -50%);
      left: 50%;
      top: 50%;
      z-index: 0;
    }

    .shape {
      height: 200px;
      width: 200px;
      position: absolute;
      border-radius: 50%;
    }

    .shape-1 {
      background: linear-gradient(#1845ad, #23a2f6);
      left: -80px;
      top: -80px;
    }

    .shape-2 {
      background: linear-gradient(to right, #ff512f, #f09819);
      right: -30px;
      bottom: -80px;
    }

    .login-form {
      height: 520px;
      width: 400px;
      max-width: 90%;
      background-color: rgba(255, 255, 255, 0.7);
      position: relative;
      z-index: 1;
      border-radius: 16px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      padding: 50px 35px;
      font-family: 'Inter', 'Poppins', sans-serif;
    }

    .login-form * {
      color: #1e293b;
      letter-spacing: 0.5px;
      outline: none;
      border: none;
    }

    .login-form h3 {
      font-size: 32px;
      font-weight: 600;
      line-height: 42px;
      text-align: center;
      margin-bottom: 30px;
      color: #1e293b;
    }

    .login-form label {
      display: block;
      margin-top: 30px;
      font-size: 16px;
      font-weight: 500;
      color: #334155;
    }

    .login-form input {
      display: block;
      height: 50px;
      width: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      border-radius: 8px;
      padding: 0 15px;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 400;
      color: #1e293b;
      border: 1px solid rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .login-form input::placeholder {
      color: #94a3b8;
    }

    .login-form input:focus {
      background-color: rgba(255, 255, 255, 0.95);
      border-color: #4cc9f0;
      box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.1);
    }

    .login-form input.ng-invalid.ng-touched {
      border-color: #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
    }

    .login-form button {
      margin-top: 50px;
      width: 100%;
      background-color: #4cc9f0;
      color: #ffffff;
      padding: 15px 0;
      font-size: 18px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .login-form button:hover:not(:disabled) {
      background-color: #3ab8d9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(76, 201, 240, 0.4);
    }

    .login-form button:active:not(:disabled) {
      transform: translateY(0);
    }

    .login-form button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-text {
      color: #ef4444;
      font-size: 12px;
      display: block;
      margin-top: 5px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .background {
        width: 350px;
        height: 450px;
      }

      .login-form {
        width: 90%;
        max-width: 380px;
        height: auto;
        min-height: 480px;
        padding: 40px 30px;
      }

      .login-form h3 {
        font-size: 28px;
      }

      .shape {
        height: 150px;
        width: 150px;
      }

      .shape-1 {
        left: -60px;
        top: -60px;
      }

      .shape-2 {
        right: -20px;
        bottom: -60px;
      }
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 1rem;
      }

      .background {
        width: 300px;
        height: 400px;
      }

      .login-form {
        width: 95%;
        padding: 35px 25px;
        min-height: 450px;
      }

      .login-form h3 {
        font-size: 24px;
        margin-bottom: 25px;
      }

      .login-form label {
        margin-top: 25px;
        font-size: 14px;
      }

      .login-form input {
        height: 45px;
        font-size: 13px;
      }

      .login-form button {
        margin-top: 40px;
        padding: 12px 0;
        font-size: 16px;
      }

      .shape {
        height: 120px;
        width: 120px;
      }
    }
  `]
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


