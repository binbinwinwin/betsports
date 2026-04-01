import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { BetSlip } from './components/bet-slip/bet-slip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, BetSlip],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
