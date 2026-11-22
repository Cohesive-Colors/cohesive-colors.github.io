import { App, SuggestModal } from 'obsidian';
import type { Palette } from './engine/types';
import type { CohesiveSettings } from './settings';
import { renderStrip } from './swatches';
import seed from './engine/palettes.json';

/** The 480 curated palettes shipped with the site, most liked first. */
export const CURATED = seed as unknown as Palette[];

/**
 * Searches the curated set. A query can mix words and filters:
 * "warm 7" → palettes of 7 colours matching "warm"; "#e2725b" → palettes
 * containing a colour starting with that hex.
 */
export class BrowseModal extends SuggestModal<Palette> {
  constructor(
    app: App,
    private readonly settings: CohesiveSettings,
    private readonly onPick: (palette: Palette, edit: boolean) => void,
  ) {
    super(app);
    this.modalEl.addClass('cc-browse');
    this.setPlaceholder('Search 480 palettes by name, mood, size (e.g. "7") or #hex');
    this.limit = 60;
    this.setInstructions([
      { command: '↑↓', purpose: 'to navigate' },
      { command: '↵', purpose: 'to insert' },
      { command: 'shift ↵', purpose: 'to edit before inserting' },
      { command: 'esc', purpose: 'to dismiss' },
    ]);
  }

  onOpen(): void {
    void super.onOpen();
    // Shift+Enter picks the highlighted palette and opens it in the generator.
    this.scope.register(['Shift'], 'Enter', (evt) => {
      this.selectActiveSuggestion(evt);
      return false;
    });
  }

  getSuggestions(query: string): Palette[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const sizes = words.filter((w) => /^(3|4|5|6|7|8|9|10)$/.test(w)).map(Number);
    const hexes = words.filter((w) => w.startsWith('#'));
    const terms = words.filter((w) => !sizes.includes(Number(w)) && !w.startsWith('#'));

    return CURATED.filter((p) => {
      if (sizes.length && !sizes.includes(p.colors.length)) return false;
      if (hexes.length && !hexes.every((h) => p.colors.some((c) => c.toLowerCase().startsWith(h)))) return false;
      const haystack = `${p.name} ${p.moods.join(' ')} ${p.harmony}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }

  renderSuggestion(palette: Palette, el: HTMLElement): void {
    el.addClass('cc-suggestion');
    renderStrip(el, palette.colors, {
      format: this.settings.copyFormat,
      showLabels: false,
      interactive: false,
      cls: 'cc-strip-small',
    });
    const text = el.createDiv({ cls: 'cc-suggestion-text' });
    text.createDiv({ cls: 'cc-name', text: palette.name });
    text.createDiv({
      cls: 'cc-sub',
      text: `${palette.colors.length} colours · ${palette.moods.slice(0, 2).join(', ')}`,
    });
  }

  onChooseSuggestion(palette: Palette, evt: MouseEvent | KeyboardEvent): void {
    this.onPick(palette, evt.shiftKey);
  }
}
