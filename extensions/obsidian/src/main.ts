import {
  Editor,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  setIcon,
  setTooltip,
} from 'obsidian';
import { BrowseModal } from './browse-modal';
import { paletteFromColors } from './engine/palette';
import type { Palette } from './engine/types';
import { BLOCK_LANGUAGE, blockFor, findHexColors, markdownFor, parseBlock, siteLink } from './format';
import { GeneratorModal } from './generator-modal';
import { CohesiveSettingTab, DEFAULT_SETTINGS, type CohesiveSettings } from './settings';
import { renderStrip } from './swatches';

/** Opening line of a swatch block, with any fence length or style. */
const FENCE = new RegExp(`^\\s*(\`{3,}|~{3,})\\s*${BLOCK_LANGUAGE}\\b`);

export default class CohesiveColorsPlugin extends Plugin {
  settings: CohesiveSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor(BLOCK_LANGUAGE, (source, el, ctx) => this.renderBlock(source, el, ctx));

    this.addRibbonIcon('palette', 'Generate a cohesive palette', () => this.openGenerator(this.activeEditor()));

    this.addCommand({
      id: 'generate-palette',
      name: 'Generate palette',
      callback: () => this.openGenerator(this.activeEditor()),
    });

    this.addCommand({
      id: 'browse-palettes',
      name: 'Browse curated palettes',
      callback: () => this.openBrowser(this.activeEditor()),
    });

    this.addCommand({
      id: 'palette-from-selection',
      name: 'Turn selected hex codes into a swatch block',
      editorCheckCallback: (checking, editor) => {
        const colors = findHexColors(editor.getSelection());
        if (colors.length < 2) return false;
        if (!checking) {
          editor.replaceSelection(blockFor({ name: 'Palette', colors: colors.slice(0, 12) }));
        }
        return true;
      },
    });

    this.addSettingTab(new CohesiveSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<CohesiveSettings> | null) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Re-renders swatch blocks in open notes after a display setting changes. */
  refreshBlocks(): void {
    this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
      if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
    });
  }

  private activeEditor(): Editor | null {
    return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
  }

  /** Inserts at the cursor, or copies when no note is open (ribbon, command palette from a non-note view). */
  private async insert(editor: Editor | null, palette: Palette): Promise<void> {
    const text = markdownFor(palette, this.settings.insertFormat);
    if (editor) {
      const block = this.settings.insertFormat === 'block';
      const cursor = editor.getCursor();
      const line = editor.getLine(cursor.line);
      // A fenced block must start on its own line.
      const prefix = block && line.trim().length > 0 ? '\n\n' : '';
      editor.replaceSelection(`${prefix}${text}${block ? '\n' : ''}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      new Notice('No note is open: the palette was copied to the clipboard.');
    } catch {
      new Notice('Open a note to insert the palette.');
    }
  }

  private openGenerator(editor: Editor | null, initial?: Palette): void {
    new GeneratorModal(this.app, this.settings, {
      initial,
      submitLabel: editor ? 'Insert' : 'Copy',
      onSubmit: (palette) => void this.insert(editor, palette),
    }).open();
  }

  private openBrowser(editor: Editor | null): void {
    new BrowseModal(this.app, this.settings, (palette, edit) => {
      if (edit) this.openGenerator(editor, palette);
      else void this.insert(editor, palette);
    }).open();
  }

  private renderBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const { name, colors } = parseBlock(source);
    const card = el.createDiv({ cls: 'cc-block' });

    if (colors.length === 0) {
      card.createDiv({ cls: 'cc-empty', text: 'No colours yet. Add hex codes such as #e2725b to this block.' });
      return;
    }

    renderStrip(card, colors, {
      format: this.settings.copyFormat,
      showLabels: this.settings.showLabels,
      cls: 'cc-strip-block',
    });

    const footer = card.createDiv({ cls: 'cc-block-footer' });
    footer.createSpan({ cls: 'cc-name', text: name ?? 'Palette' });
    footer.createSpan({ cls: 'cc-sub', text: `${colors.length} colours` });
    const actions = footer.createDiv({ cls: 'cc-block-actions' });

    const edit = actions.createEl('button', { cls: 'clickable-icon', attr: { type: 'button', 'aria-label': 'Edit palette' } });
    setIcon(edit, 'pencil');
    setTooltip(edit, 'Edit in the generator');
    edit.addEventListener('click', () => {
      const palette = paletteFromColors(colors, { name: name ?? 'Palette' });
      new GeneratorModal(this.app, this.settings, {
        initial: palette,
        submitLabel: 'Update block',
        onSubmit: (next) => void this.replaceBlock(el, ctx, next),
      }).open();
    });

    const open = actions.createEl('a', {
      cls: 'clickable-icon',
      href: siteLink({ name: name ?? 'Palette', colors }),
      attr: { 'aria-label': 'Open on Cohesive Colors' },
    });
    setIcon(open, 'external-link');
    setTooltip(open, 'Open on Cohesive Colors: contrast matrix and image export');

    // Keep the rendered element tied to the note's lifecycle.
    ctx.addChild(new MarkdownRenderChild(card));
  }

  /** Rewrites the fenced block that `el` was rendered from. */
  private async replaceBlock(el: HTMLElement, ctx: MarkdownPostProcessorContext, palette: Palette): Promise<void> {
    const info = ctx.getSectionInfo(el);
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!info || !(file instanceof TFile)) {
      new Notice('Could not find this block in the note. Copy the palette from the generator instead.');
      return;
    }
    let replaced = false;
    await this.app.vault.process(file, (data) => {
      const lines = data.split('\n');
      const opening = lines[info.lineStart] ?? '';
      // Only replace if the block is still where it was rendered from.
      if (!FENCE.test(opening)) return data;
      lines.splice(info.lineStart, info.lineEnd - info.lineStart + 1, blockFor(palette));
      replaced = true;
      return lines.join('\n');
    });
    if (!replaced) new Notice('The note changed while editing; the block was left as it was.');
  }
}
