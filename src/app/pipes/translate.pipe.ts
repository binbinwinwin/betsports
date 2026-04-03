import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private ts = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.ts.t(key, params);
  }
}
