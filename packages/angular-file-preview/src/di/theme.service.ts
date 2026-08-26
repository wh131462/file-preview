import { Injectable, signal } from '@angular/core';

export type ResolvedTheme = 'dark' | 'light';

@Injectable()
export class ThemeService {
  private readonly themeSig = signal<ResolvedTheme>('dark');
  readonly theme = this.themeSig.asReadonly();

  setTheme(theme: ResolvedTheme): void {
    this.themeSig.set(theme);
  }
}
