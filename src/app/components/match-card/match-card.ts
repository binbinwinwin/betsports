import { Component, Input, inject } from '@angular/core';
import { Match, BetSelection } from '../../models/match.model';
import { BetService } from '../../services/bet.service';
import { OddsButton } from '../odds-button/odds-button';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [OddsButton],
  templateUrl: './match-card.html',
  styleUrl: './match-card.css',
})
export class MatchCard {
  @Input() match!: Match;

  private betService = inject(BetService);

  isSelected(selection: BetSelection): boolean {
    return this.betService.isSelected(this.match.id, selection);
  }

  onOddsClick(selection: BetSelection): void {
    this.betService.addBet(this.match, selection);
  }

  sportIcon(sport: string): string {
    const icons: Record<string, string> = {
      football: '⚽',
      basketball: '🏀',
      baseball: '⚾',
      tennis: '🎾',
    };
    return icons[sport] ?? '🏆';
  }

  formatScore(): string {
    return `${this.match.score.home} : ${this.match.score.away}`;
  }
}
