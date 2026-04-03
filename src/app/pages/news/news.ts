import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NEWS_ARTICLES } from './news-detail';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './news.html',
  styleUrl: './news.css',
})
export class News {
  ts = inject(TranslationService);
  articles = NEWS_ARTICLES;
}
