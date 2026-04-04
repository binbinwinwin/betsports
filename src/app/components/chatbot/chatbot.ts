import { Component, signal, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { API } from '../../services/auth.service';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

const QUICK_QUESTIONS = [
  { labelKey: 'chat.q.deposit', answerKey: 'chat.a.deposit' },
  { labelKey: 'chat.q.withdraw', answerKey: 'chat.a.withdraw' },
  { labelKey: 'chat.q.odds', answerKey: 'chat.a.odds' },
  { labelKey: 'chat.q.account', answerKey: 'chat.a.account' },
];

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot implements AfterViewChecked {
  @ViewChild('messageList') messageListRef!: ElementRef;

  ts = inject(TranslationService);
  private http = inject(HttpClient);

  open = signal(false);
  inputText = '';
  messages = signal<Message[]>([]);
  loading = signal(false);
  private initialized = false;

  toggle(): void {
    this.open.update(v => !v);
    if (this.open() && !this.initialized) {
      this.initialized = true;
      setTimeout(() => {
        this.messages.set([{ role: 'bot', text: this.ts.t('chat.welcome') }]);
      }, 150);
    }
  }

  close(): void {
    this.open.set(false);
  }

  reset(): void {
    this.messages.set([{ role: 'bot', text: this.ts.t('chat.welcome') }]);
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;
    this.inputText = '';
    this.messages.update(m => [...m, { role: 'user', text }]);
    this.callClaude(text);
  }

  quickAsk(labelKey: string): void {
    if (this.loading()) return;
    const question = this.ts.t(labelKey);
    this.messages.update(m => [...m, { role: 'user', text: question }]);
    this.callClaude(question);
  }

  private callClaude(userText: string): void {
    this.loading.set(true);

    // 把對話歷史轉成 API 格式（跳過歡迎訊息）
    const history = this.messages()
      .filter(m => !(m.role === 'bot' && m.text === this.ts.t('chat.welcome')))
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', text: m.text }));

    this.http.post<{ reply: string }>(`${API}/chat`, {
      messages: history,
      lang: this.ts.lang(),
    }).subscribe({
      next: ({ reply }) => {
        this.loading.set(false);
        this.messages.update(m => [...m, { role: 'bot', text: reply }]);
      },
      error: () => {
        this.loading.set(false);
        this.messages.update(m => [...m, { role: 'bot', text: this.ts.t('chat.a.unknown') }]);
      },
    });
  }

  get quickQuestions() {
    return QUICK_QUESTIONS;
  }

  ngAfterViewChecked(): void {
    if (this.messageListRef) {
      const el = this.messageListRef.nativeElement as HTMLElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
