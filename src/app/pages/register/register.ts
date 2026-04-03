import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    if (!this.username || !this.password) {
      this.error.set('請填寫所有欄位');
      return;
    }
    if (this.username.length < 3) {
      this.error.set('帳號至少需要 3 個字元');
      return;
    }
    if (this.password.length < 5) {
      this.error.set('密碼至少需要 5 個字元');
      return;
    }
    if (!/[a-zA-Z]/.test(this.password) || !/[0-9]/.test(this.password)) {
      this.error.set('密碼必須包含至少一個英文字母和一個數字');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('兩次密碼不一致');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.username, this.password, this.username).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
