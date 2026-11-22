import { Notice, setIcon, setTooltip } from 'obsidian';
import { readableInk } from './engine/core';
import { formatColor, type CopyFormat } from './format';

export interface StripOptions {
  format: CopyFormat;
  showLabels: boolean;
  /** Index-aligned locked colours; shows lock toggles when given. */
  locks?: (string | null)[];
  onToggleLock?: (index: number) => void;
  /** False renders plain stripes with no copy buttons (inside a list row that is itself clickable). */
  interactive?: boolean;
  /** Extra class on the strip, for size variants. */
  cls?: string;
}

export async function copyColor(hex: string, format: CopyFormat): Promise<void> {
  const value = formatColor(hex, format);
  try {
    await navigator.clipboard.writeText(value);
    new Notice(`Copied ${value}`);
  } catch {
    new Notice('Could not copy to the clipboard.');
  }
}

/**
 * A row of colour stripes. Each stripe is a real button: click or Enter copies
 * its colour. Colours are dynamic, so they are passed as CSS variables and the
 * look stays in styles.css.
 */
export function renderStrip(parent: HTMLElement, colors: string[], opts: StripOptions): HTMLElement {
  const strip = parent.createDiv({ cls: ['cc-strip', ...(opts.cls ? [opts.cls] : [])] });
  colors.forEach((hex, i) => {
    const swatch = strip.createDiv({ cls: 'cc-swatch' });
    swatch.style.setProperty('--cc-swatch', hex);
    swatch.style.setProperty('--cc-ink', readableInk(hex));

    if (opts.interactive !== false) {
      const value = formatColor(hex, opts.format);
      const button = swatch.createEl('button', {
        cls: 'cc-swatch-button',
        attr: { type: 'button', 'aria-label': `Copy ${value}` },
      });
      setTooltip(button, `Copy ${value}`);
      button.addEventListener('click', () => void copyColor(hex, opts.format));
    }

    if (opts.showLabels) {
      swatch.createSpan({ cls: 'cc-swatch-label', text: hex.replace('#', '').toUpperCase() });
    }

    if (opts.onToggleLock) {
      const locked = Boolean(opts.locks?.[i]);
      const lock = swatch.createEl('button', {
        cls: ['cc-lock', ...(locked ? ['is-locked'] : [])],
        attr: { type: 'button', 'aria-label': locked ? 'Unlock colour' : 'Lock colour', 'aria-pressed': String(locked) },
      });
      setIcon(lock, locked ? 'lock' : 'lock-open');
      setTooltip(lock, locked ? 'Unlock' : 'Lock — keep this colour when regenerating');
      lock.addEventListener('click', (e) => {
        e.stopPropagation();
        opts.onToggleLock?.(i);
      });
    }
  });
  return strip;
}
