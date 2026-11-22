import { App, ButtonComponent, DropdownComponent, Modal, Notice, Setting, SliderComponent } from 'obsidian';
import { EXPORT_FORMATS, exportAs, type ExportFormat } from './engine/export';
import { HARMONIES } from './engine/harmony';
import { generatePalette, paletteFromColors, recohere, resolveCohesion, TINT_SWATCHES } from './engine/palette';
import type { HarmonyKind, Palette } from './engine/types';
import { siteLink } from './format';
import type { CohesiveSettings } from './settings';
import { renderStrip } from './swatches';

export interface GeneratorOptions {
  /** Start from this palette instead of a fresh one (editing a block). */
  initial?: Pick<Palette, 'name' | 'colors'> & Partial<Palette>;
  /** Label of the main button, e.g. "Insert" or "Update block". */
  submitLabel: string;
  onSubmit: (palette: Palette) => void;
}

const SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

export class GeneratorModal extends Modal {
  private size: number;
  private harmony: HarmonyKind | 'auto' = 'auto';
  private tint: string;
  private alpha: number;
  private locks: (string | null)[] = [];
  private palette: Palette;
  private exportFormat: ExportFormat = 'css';
  private body!: HTMLElement;

  constructor(
    app: App,
    private readonly settings: CohesiveSettings,
    private readonly options: GeneratorOptions,
  ) {
    super(app);
    const cohesion = resolveCohesion(options.initial?.cohesion);
    this.tint = cohesion.tint;
    this.alpha = options.initial ? (options.initial.cohesion?.alpha ?? 0) : cohesion.alpha;
    if (options.initial) {
      this.palette = paletteFromColors(options.initial.colors, {
        ...options.initial,
        cohesion: { ...cohesion, alpha: this.alpha },
      });
      this.size = this.palette.colors.length;
    } else {
      this.size = settings.defaultSize;
      this.palette = this.generate();
    }
  }

  onOpen(): void {
    this.modalEl.addClass('cc-modal');
    this.titleEl.setText('Cohesive palette');
    this.body = this.contentEl.createDiv({ cls: 'cc-generator' });
    this.render();

    // Space regenerates, as on the website, unless a control has focus.
    this.scope.register([], ' ', (evt) => {
      const tag = (evt.target as HTMLElement | null)?.tagName ?? '';
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag)) return true;
      this.regenerate();
      return false;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private generate(): Palette {
    const locks = this.locks.slice(0, this.size);
    return generatePalette({
      size: this.size,
      harmony: this.harmony === 'auto' ? undefined : this.harmony,
      cohesion: { tint: this.tint, alpha: this.alpha },
      locks,
    });
  }

  private regenerate(): void {
    this.locks = this.locks.slice(0, this.size);
    this.palette = this.generate();
    this.render();
  }

  /** Re-runs only the cohesion pass, keeping the palette's raw colours. */
  private retint(): void {
    const next = recohere(this.palette, { ...this.palette.cohesion, tint: this.tint, alpha: this.alpha });
    if (this.locks.some(Boolean)) {
      next.colors = next.colors.map((c, i) => this.locks[i] ?? c);
    }
    this.palette = next;
    this.renderPreview();
  }

  private toggleLock(i: number): void {
    while (this.locks.length < this.size) this.locks.push(null);
    this.locks[i] = this.locks[i] ? null : (this.palette.colors[i] ?? null);
    this.renderPreview();
  }

  private previewEl!: HTMLElement;

  private strengthLabel(): string {
    return `Cohesion strength · ${Math.round((this.alpha / 0.5) * 100)}%`;
  }

  private renderPreview(): void {
    this.previewEl.empty();
    renderStrip(this.previewEl, this.palette.colors, {
      format: this.settings.copyFormat,
      showLabels: this.palette.colors.length <= 7,
      locks: this.locks,
      onToggleLock: (i) => this.toggleLock(i),
      cls: 'cc-strip-large',
    });
    const meta = this.previewEl.createDiv({ cls: 'cc-meta' });
    meta.createDiv({ cls: 'cc-name', text: this.palette.name });
    const moods = this.palette.moods?.slice(0, 2).join(', ');
    meta.createDiv({
      cls: 'cc-sub',
      text: `${this.palette.colors.length} colours${moods ? ` · ${moods}` : ''}`,
    });
  }

  private render(): void {
    const el = this.body;
    el.empty();

    this.previewEl = el.createDiv({ cls: 'cc-preview' });
    this.renderPreview();

    const sizeRow = new Setting(el).setName('Swatches');
    const chips = sizeRow.controlEl.createDiv({ cls: 'cc-chips' });
    for (const n of SIZES) {
      const chip = chips.createEl('button', {
        cls: ['cc-chip', ...(n === this.size ? ['is-active'] : [])],
        text: String(n),
        attr: { type: 'button', 'aria-pressed': String(n === this.size) },
      });
      chip.addEventListener('click', () => {
        this.size = n;
        this.regenerate();
      });
    }

    new Setting(el).setName('Harmony').addDropdown((d: DropdownComponent) => {
      d.addOption('auto', 'Surprise me');
      for (const h of HARMONIES) d.addOption(h, h[0]!.toUpperCase() + h.slice(1).replace('-', ' '));
      d.setValue(this.harmony).onChange((v) => {
        this.harmony = v as HarmonyKind | 'auto';
        this.regenerate();
      });
    });

    const keyRow = new Setting(el)
      .setName('Key colour')
      .setDesc('Every swatch is blended with it, so the set shares one hue axis.');
    const dots = keyRow.controlEl.createDiv({ cls: 'cc-dots' });
    for (const t of TINT_SWATCHES) {
      const dot = dots.createEl('button', {
        cls: ['cc-dot', ...(t.hex === this.tint ? ['is-active'] : [])],
        attr: { type: 'button', 'aria-label': t.name, 'aria-pressed': String(t.hex === this.tint) },
      });
      dot.style.setProperty('--cc-swatch', t.hex);
      dot.addEventListener('click', () => {
        this.tint = t.hex;
        dots.querySelectorAll('.cc-dot').forEach((d) => d.toggleClass('is-active', d === dot));
        this.retint();
      });
    }

    const strength = new Setting(el).setName(this.strengthLabel());
    strength.addSlider((s: SliderComponent) =>
      s
        .setLimits(0, 0.5, 0.01)
        .setValue(this.alpha)
        .onChange((v) => {
          this.alpha = v;
          strength.setName(this.strengthLabel());
          this.retint();
        }),
    );

    new Setting(el)
      .setName('Copy as code')
      .addDropdown((d) => {
        for (const f of EXPORT_FORMATS) d.addOption(f.id, f.label);
        d.setValue(this.exportFormat).onChange((v) => (this.exportFormat = v as ExportFormat));
      })
      .addButton((b) =>
        b.setIcon('copy').setTooltip('Copy code').onClick(async () => {
          try {
            await navigator.clipboard.writeText(exportAs(this.exportFormat, this.palette));
            new Notice('Palette copied as code.');
          } catch {
            new Notice('Could not copy to the clipboard.');
          }
        }),
      );

    const footer = el.createDiv({ cls: 'modal-button-container cc-footer' });
    const link = footer.createEl('a', {
      cls: 'cc-site-link',
      text: 'Open on Cohesive Colors',
      href: siteLink(this.palette),
    });
    link.addEventListener('click', () => link.setAttr('href', siteLink(this.palette)));

    new ButtonComponent(footer)
      .setButtonText('Regenerate')
      .setTooltip('Regenerate unlocked swatches (Space)')
      .onClick(() => this.regenerate());
    new ButtonComponent(footer)
      .setButtonText(this.options.submitLabel)
      .setCta()
      .onClick(() => {
        this.options.onSubmit(this.palette);
        this.close();
      });
  }
}
