import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, API } from '../../services/auth.service';
import { BetService } from '../../services/bet.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  betService = inject(BetService);
  ts = inject(TranslationService);

  memberLabel(): string {
    const tier = this.betService.memberTier();
    if (tier === 'diamond') return this.ts.t('profile.member.diamond');
    if (tier === 'vip') return this.ts.t('profile.member.vip');
    if (tier === 'premium') return this.ts.t('profile.member.premium');
    return this.ts.t('profile.member');
  }

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwLoading = signal(false);
  pwError = signal('');
  pwSuccess = signal(false);

  submit(): void {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.pwError.set(this.ts.t('profile.errorFillAll'));
      return;
    }
    if (this.newPassword.length < 5) {
      this.pwError.set(this.ts.t('profile.errorMinLen'));
      return;
    }
    if (!/[a-zA-Z]/.test(this.newPassword) || !/[0-9]/.test(this.newPassword)) {
      this.pwError.set(this.ts.t('profile.errorFormat'));
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError.set(this.ts.t('profile.errorMismatch'));
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
        this.pwError.set(err.error?.detail ?? this.ts.t('profile.errorFailed'));
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
