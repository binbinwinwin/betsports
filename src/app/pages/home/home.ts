import { Component, inject, signal, computed } from '@angular/core';
import { SportsService } from '../../services/sports.service';
import { MatchCard } from '../../components/match-card/match-card';
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
  imports: [MatchCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private sportsService = inject(SportsService);

  tabs: Tab[] = [
    { key: 'all',        label: '全部',  icon: '🏆' },
    { key: 'football',   label: '足球',  icon: '⚽' },
    { key: 'basketball', label: '籃球',  icon: '🏀' },
    { key: 'baseball',   label: '棒球',  icon: '⚾' },
    { key: 'tennis',     label: '網球',  icon: '🎾' },
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
