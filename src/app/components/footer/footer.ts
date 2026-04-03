import { Component, inject } from '@angular/core';
import { TranslationService, Lang } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  ts = inject(TranslationService);
  year = new Date().getFullYear();

  setLang(lang: Lang): void {
    this.ts.setLang(lang);
  }
}
