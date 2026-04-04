import { Component, signal, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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

const KEYWORD_MAP: { keywords: string[]; answerKey: string }[] = [
  { keywords: ['入金', 'deposit', '充值', '儲值', '入款'], answerKey: 'chat.a.deposit' },
  { keywords: ['出金', 'withdraw', '提款', '出款', '提現'], answerKey: 'chat.a.withdraw' },
  { keywords: ['賠率', 'odds', '賠錢', '倍率'], answerKey: 'chat.a.odds' },
  { keywords: ['帳號', 'account', '登入', '密碼', '註冊', 'login', 'password'], answerKey: 'chat.a.account' },
  { keywords: ['投注', 'bet', '下注', '押注'], answerKey: 'chat.a.bet' },
  { keywords: ['串關', 'parlay', '過關'], answerKey: 'chat.a.parlay' },
  { keywords: ['規則', 'rule', '條款', '限制'], answerKey: 'chat.a.rules' },
  { keywords: ['客服', 'service', '聯絡', 'contact', '幫助', 'help'], answerKey: 'chat.a.contact' },
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

  open = signal(false);
  inputText = '';
  messages = signal<Message[]>([]);
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

  send(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.inputText = '';
    this.messages.update(m => [...m, { role: 'user', text }]);
    setTimeout(() => this.respond(text), 400);
  }

  quickAsk(labelKey: string, answerKey: string): void {
    const question = this.ts.t(labelKey);
    this.messages.update(m => [...m, { role: 'user', text: question }]);
    setTimeout(() => {
      this.messages.update(m => [...m, { role: 'bot', text: this.ts.t(answerKey) }]);
    }, 400);
  }

  private respond(text: string): void {
    const lower = text.toLowerCase();
    const matched = KEYWORD_MAP.find(({ keywords }) =>
      keywords.some(k => lower.includes(k.toLowerCase()))
    );
    const reply = matched
      ? this.ts.t(matched.answerKey)
      : this.ts.t('chat.a.unknown');
    this.messages.update(m => [...m, { role: 'bot', text: reply }]);
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
