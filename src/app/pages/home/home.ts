import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { SportsService } from '../../services/sports.service';
import { MatchCard } from '../../components/match-card/match-card';
import { BetSlip } from '../../components/bet-slip/bet-slip';
import { AuthService } from '../../services/auth.service';
import { BetService } from '../../services/bet.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SportType } from '../../models/match.model';

type TabType = 'all' | SportType;

interface Tab {
  key: TabType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatchCard, BetSlip, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private sportsService = inject(SportsService);
  auth = inject(AuthService);
  private betService = inject(BetService);
  ts = inject(TranslationService);

  mobileSlipOpen = signal(false);
  isMobile = signal(window.innerWidth <= 900);

  get betCount() { return this.betService.betItems().length; }

  openSlip(): void { this.mobileSlipOpen.set(true); }
  closeSlip(): void { this.mobileSlipOpen.set(false); }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth <= 900);
  }

  tabs: { key: TabType; labelKey: string; icon: string }[] = [
    { key: 'all',        labelKey: 'home.allTab',    icon: '🏆' },
    { key: 'football',   labelKey: 'home.football',  icon: '⚽' },
    { key: 'basketball', labelKey: 'home.basketball', icon: '🏀' },
    { key: 'baseball',   labelKey: 'home.baseball',  icon: '⚾' },
    { key: 'tennis',     labelKey: 'home.tennis',    icon: '🎾' },
    { key: 'esports',    labelKey: 'home.esports',   icon: '🎮' },
  ];

  activeTab = signal<TabType>('all');

  filteredMatches = computed(() => {
    const tab = this.activeTab();
    const all = this.sportsService.matches();
    if (tab === 'all') return all;
    return all.filter(m => m.sport === tab);
  });

  liveCount = computed(() =>
    this.filteredMatches().filter(m => m.status === 'live').length
  );

  setTab(tab: TabType): void {
    this.activeTab.set(tab);
  }
}
