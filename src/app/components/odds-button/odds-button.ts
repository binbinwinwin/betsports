import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal
} from '@angular/core';

@Component({
  selector: 'app-odds-button',
  standalone: true,
  templateUrl: './odds-button.html',
  styleUrl: './odds-button.css',
})
export class OddsButton implements OnChanges {
  @Input() label = '';
  @Input() odds: number | null = null;
  @Input() isSelected = false;
  @Output() clicked = new EventEmitter<void>();

  flashClass = signal<'odds-up' | 'odds-down' | ''>('');
  private prevOdds: number | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['odds'] && this.prevOdds !== null && this.odds !== null) {
      const prev = this.prevOdds;
      const curr = this.odds;
      if (curr > prev) {
        this.triggerFlash('odds-up');
      } else if (curr < prev) {
        this.triggerFlash('odds-down');
      }
    }
    if (changes['odds'] && this.odds !== null) {
      this.prevOdds = this.odds;
    }
  }

  private triggerFlash(cls: 'odds-up' | 'odds-down'): void {
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashClass.set(cls);
    this.flashTimer = setTimeout(() => this.flashClass.set(''), 800);
  }

  onClick(): void {
    if (this.odds === null) return;
    this.clicked.emit();
  }

  formatOdds(v: number | null): string {
    if (v === null) return '-';
    return v.toFixed(2);
  }
}
