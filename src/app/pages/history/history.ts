import { Component, inject, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { BetService } from '../../services/bet.service';
import { PlacedBet } from '../../models/match.model';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HttpClient } from '@angular/common/http';
import { API } from '../../services/auth.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class History implements AfterViewInit, OnDestroy {
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas')  pieCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas')  barCanvas!:  ElementRef<HTMLCanvasElement>;

  private betService = inject(BetService);
  private http = inject(HttpClient);
  ts = inject(TranslationService);

  private lineChart?: Chart;
  private pieChart?:  Chart;
  private barChart?:  Chart;

  get placedBets(): PlacedBet[] {
    return this.betService.placedBets();
  }

  get settledBets(): PlacedBet[] {
    return this.placedBets.filter(b => b.status !== 'pending');
  }

  formatDate(date: Date): string {
    return date.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatNumber(n: number): string {
    return n.toLocaleString('zh-TW');
  }

  statusLabel(status: PlacedBet['status']): string {
    return this.ts.t('history.' + status);
  }

  totalStake(): number {
    return this.placedBets.reduce((s, b) => s + b.stake, 0);
  }

  clearHistory(): void {
    if (!confirm('確定要清除所有投注紀錄嗎？')) return;
    this.http.delete(`${API}/bets/clear`).subscribe({
      next: () => {
        this.betService.placedBets.set([]);
        this.destroyCharts();
      },
    });
  }

  private isDark(): boolean {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  private get textColor() { return this.isDark() ? '#8b949e' : '#57606a'; }
  private get gridColor() { return this.isDark() ? '#21262d' : '#e0e4e8'; }

  ngAfterViewInit(): void {
    this.buildCharts();
  }

  buildCharts(): void {
    this.destroyCharts();
    if (this.placedBets.length === 0) return;
    this.buildLine();
    this.buildPie();
    this.buildBar();
  }

  private buildLine(): void {
    const sorted = [...this.placedBets].sort(
      (a, b) => a.placedAt.getTime() - b.placedAt.getTime()
    );
    let cumulative = 0;
    const labels: string[] = [];
    const data: number[] = [];
    sorted.forEach((bet, i) => {
      const pnl = bet.status === 'won'
        ? bet.potentialWin - bet.stake
        : bet.status === 'lost' ? -bet.stake : 0;
      cumulative += pnl;
      labels.push(`#${i + 1}`);
      data.push(cumulative);
    });

    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '累積損益 (NT$)',
          data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: data.map(v => v >= 0 ? '#39d353' : '#f85149'),
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: this.textColor } } },
        scales: {
          x: { ticks: { color: this.textColor }, grid: { color: this.gridColor } },
          y: {
            ticks: { color: this.textColor },
            grid: { color: this.gridColor },
            zero: true,
          } as any,
        },
      },
    });
  }

  private buildPie(): void {
    const won  = this.placedBets.filter(b => b.status === 'won').length;
    const lost = this.placedBets.filter(b => b.status === 'lost').length;
    const pending = this.placedBets.filter(b => b.status === 'pending').length;

    this.pieChart = new Chart(this.pieCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['勝', '敗', '待結算'],
        datasets: [{
          data: [won, lost, pending],
          backgroundColor: ['#39d353', '#f85149', '#8b949e'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: this.textColor, padding: 16 },
          },
        },
      },
    });
  }

  private inferSportFromId(matchId: string): string {
    const id = matchId.toLowerCase();
    if (id.startsWith('bb')) return 'baseball';
    if (id.startsWith('b'))  return 'basketball';
    if (id.startsWith('f'))  return 'football';
    if (id.startsWith('t'))  return 'tennis';
    if (id.startsWith('e'))  return 'esports';
    return '';
  }

  private buildBar(): void {
    const sportMap: Record<string, number> = {
      football: 0, basketball: 0, baseball: 0, tennis: 0, esports: 0, other: 0,
    };
    const sportLabels: Record<string, string> = {
      football: '⚽ 足球', basketball: '🏀 籃球',
      baseball: '⚾ 棒球', tennis: '🎾 網球', esports: '🎮 電競', other: '🎲 其他(串關)',
    };

    this.placedBets.forEach(b => {
      if (b.isParlay && b.parlayLegs && b.parlayLegs.length > 0) {
        const perLeg = b.stake / b.parlayLegs.length;
        b.parlayLegs.forEach(leg => {
          const sport = leg.matchId ? this.inferSportFromId(leg.matchId) : '';
          const key = (sport && sportMap[sport] !== undefined) ? sport : 'other';
          sportMap[key] += perLeg;
        });
      } else {
        const sport = b.sport || this.inferSportFromId(b.matchId);
        const key = (sport && sportMap[sport] !== undefined) ? sport : 'other';
        sportMap[key] += b.stake;
      }
    });

    // 只顯示有資料的類別
    const entries = Object.entries(sportMap).filter(([, v]) => v > 0);
    const labels = entries.map(([k]) => sportLabels[k]);
    const data   = entries.map(([, v]) => Math.round(v));

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '投注金額 (NT$)',
          data,
          backgroundColor: entries.map(([k]) => ({
            football:   'rgba(59,130,246,0.7)',
            basketball: 'rgba(240,180,41,0.7)',
            baseball:   'rgba(57,211,83,0.7)',
            tennis:     'rgba(139,92,246,0.7)',
            esports:    'rgba(248,81,73,0.7)',
            other:      'rgba(139,148,158,0.7)',
          } as Record<string,string>)[k] || 'rgba(139,148,158,0.7)'),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: this.textColor }, grid: { color: this.gridColor } },
          y: { ticks: { color: this.textColor }, grid: { color: this.gridColor } },
        },
      },
    });
  }

  private destroyCharts(): void {
    this.lineChart?.destroy();
    this.pieChart?.destroy();
    this.barChart?.destroy();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }
}
