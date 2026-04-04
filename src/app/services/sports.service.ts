import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Match, SportType } from '../models/match.model';

export interface OddsChangeEvent {
  matchId: string;
  field: 'home' | 'draw' | 'away';
  direction: 'up' | 'down';
}

@Injectable({ providedIn: 'root' })
export class SportsService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private oddsChangeSubject = new Subject<OddsChangeEvent>();
  oddsChange$ = this.oddsChangeSubject.asObservable();
  loading = signal(true);

  matches = signal<Match[]>([
    // 足球
    {
      id: 'f1',
      sport: 'football',
      league: '英格蘭超級聯賽',
      homeTeam: '曼城',
      awayTeam: '阿森納',
      startTime: '進行中',
      status: 'live',
      score: { home: 0, away: 0 },
      odds: { home: 2.10, draw: 3.40, away: 3.20 },
      minute: 67,
    },
    {
      id: 'f2',
      sport: 'football',
      league: '西班牙甲級聯賽',
      homeTeam: '皇家馬德里',
      awayTeam: '巴塞隆納',
      startTime: '今日 22:00',
      status: 'upcoming',
      score: { home: 0, away: 0 },
      odds: { home: 1.95, draw: 3.60, away: 3.80 },
    },
    {
      id: 'f3',
      sport: 'football',
      league: '歐洲冠軍聯賽',
      homeTeam: '拜仁慕尼黑',
      awayTeam: 'PSG',
      startTime: '進行中',
      status: 'live',
      score: { home: 1, away: 0 },
      odds: { home: 1.75, draw: 3.80, away: 4.20 },
      minute: 34,
    },
    // 籃球
    {
      id: 'b1',
      sport: 'basketball',
      league: 'NBA',
      homeTeam: '金州勇士',
      awayTeam: '洛杉磯湖人',
      startTime: '進行中',
      status: 'live',
      score: { home: 78, away: 74 },
      odds: { home: 1.65, draw: null, away: 2.20 },
      period: '第三節',
    },
    {
      id: 'b2',
      sport: 'basketball',
      league: 'NBA',
      homeTeam: '波士頓塞爾提克',
      awayTeam: '邁阿密熱火',
      startTime: '今日 09:30',
      status: 'upcoming',
      score: { home: 0, away: 0 },
      odds: { home: 1.55, draw: null, away: 2.45 },
    },
    // 棒球
    {
      id: 'bb1',
      sport: 'baseball',
      league: 'MLB',
      homeTeam: '紐約洋基',
      awayTeam: '洛杉磯道奇',
      startTime: '進行中',
      status: 'live',
      score: { home: 3, away: 2 },
      odds: { home: 1.80, draw: null, away: 2.05 },
      period: '第5局',
    },
    {
      id: 'bb2',
      sport: 'baseball',
      league: '中華職業棒球大聯盟',
      homeTeam: '中信兄弟',
      awayTeam: '樂天桃猿',
      startTime: '今日 18:30',
      status: 'upcoming',
      score: { home: 0, away: 0 },
      odds: { home: 1.90, draw: null, away: 1.95 },
    },
    // 電競
    {
      id: 'e1',
      sport: 'esports',
      league: 'LCK 韓國職業聯賽',
      homeTeam: 'T1',
      awayTeam: 'Gen.G',
      startTime: '進行中',
      status: 'live',
      score: { home: 1, away: 0 },
      odds: { home: 1.60, draw: null, away: 2.30 },
      period: 'Game 2',
    },
    {
      id: 'e2',
      sport: 'esports',
      league: 'ESL Pro League CS2',
      homeTeam: 'Natus Vincere',
      awayTeam: 'Vitality',
      startTime: '今日 21:00',
      status: 'upcoming',
      score: { home: 0, away: 0 },
      odds: { home: 2.05, draw: null, away: 1.78 },
    },
    {
      id: 'e3',
      sport: 'esports',
      league: 'VCT 國際聯賽',
      homeTeam: 'Sentinels',
      awayTeam: 'LOUD',
      startTime: '今日 23:30',
      status: 'upcoming',
      score: { home: 0, away: 0 },
      odds: { home: 1.90, draw: null, away: 1.92 },
    },
    {
      id: 'e4',
      sport: 'esports',
      league: 'Dota 2 Major',
      homeTeam: 'Team Spirit',
      awayTeam: 'Tundra',
      startTime: '進行中',
      status: 'live',
      score: { home: 0, away: 1 },
      odds: { home: 2.40, draw: null, away: 1.55 },
      period: 'Game 2',
    },
    // 網球
    {
      id: 't1',
      sport: 'tennis',
      league: 'ATP 大師賽',
      homeTeam: '德約科維奇',
      awayTeam: '阿爾卡拉斯',
      startTime: '進行中',
      status: 'live',
      score: { home: 1, away: 0 },
      odds: { home: 1.70, draw: null, away: 2.10 },
      period: '第2盤',
    },
    {
      id: 't2',
      sport: 'tennis',
      league: 'WTA 公開賽',
      homeTeam: '鄭欽文',
      awayTeam: '沙波瓦洛娃',
      startTime: '今日 20:00',
      status: 'upcoming',
      score: { home: 0, away: 0 },
      odds: { home: 1.85, draw: null, away: 1.98 },
    },
  ]);

  private subscription: Subscription;

  constructor() {
    setTimeout(() => this.loading.set(false), 1200);
    this.subscription = interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.randomUpdateOdds());
  }

  private randomUpdateOdds(): void {
    const updated = this.matches().map(match => {
      const newOdds = { ...match.odds };
      const fields: Array<'home' | 'draw' | 'away'> = ['home', 'away'];
      if (match.odds.draw !== null) fields.push('draw');

      fields.forEach(field => {
        if (newOdds[field] === null) return;
        const delta = (Math.random() - 0.5) * 0.1;
        const current = newOdds[field] as number;
        const updated = parseFloat((current + delta).toFixed(2));
        const min = field === 'draw' ? 2.80 : 1.30;
        const max = field === 'draw' ? 4.50 : 5.00;
        newOdds[field] = Math.max(min, Math.min(max, updated));

        if (Math.abs(delta) > 0.01) {
          this.oddsChangeSubject.next({
            matchId: match.id,
            field,
            direction: delta > 0 ? 'up' : 'down',
          });
        }
      });

      return { ...match, odds: newOdds };
    });

    this.matches.set(updated);
  }

  getMatchesBySport(sport: SportType | 'all'): Match[] {
    if (sport === 'all') return this.matches();
    return this.matches().filter(m => m.sport === sport);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
