import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, API } from '../../services/auth.service';
import { BetService } from '../../services/bet.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  betService = inject(BetService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwLoading = signal(false);
  pwError = signal('');
  pwSuccess = signal(false);

  submit(): void {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.pwError.set('請填寫所有欄位');
      return;
    }
    if (this.newPassword.length < 5) {
      this.pwError.set('新密碼至少需要 5 個字元');
      return;
    }
    if (!/[a-zA-Z]/.test(this.newPassword) || !/[0-9]/.test(this.newPassword)) {
      this.pwError.set('新密碼必須包含至少一個英文字母和一個數字');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError.set('兩次密碼不一致');
      return;
    }

    this.pwLoading.set(true);
    this.pwError.set('');
    this.pwSuccess.set(false);

    this.http.post(
      `${API}/auth/change-password`,
      { current_password: this.currentPassword, new_password: this.newPassword }
    ).pipe(
      catchError(err => {
        this.pwLoading.set(false);
        this.pwError.set(err.error?.detail ?? '修改失敗，請稍後再試');
        return throwError(() => err);
      })
    ).subscribe(() => {
      this.pwLoading.set(false);
      this.pwSuccess.set(true);
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    });
  }
}
