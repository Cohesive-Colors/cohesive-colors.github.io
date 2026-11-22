import { App, PluginSettingTab, Setting } from 'obsidian';
import type { CopyFormat, InsertFormat } from './format';
import type CohesiveColorsPlugin from './main';

export interface CohesiveSettings {
  insertFormat: InsertFormat;
  copyFormat: CopyFormat;
  defaultSize: number;
  showLabels: boolean;
}

export const DEFAULT_SETTINGS: CohesiveSettings = {
  insertFormat: 'block',
  copyFormat: 'hex',
  defaultSize: 5,
  showLabels: true,
};

export class CohesiveSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: CohesiveColorsPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Insert palettes as')
      .setDesc('Swatch blocks render as colour stripes; the other formats are plain Markdown.')
      .addDropdown((d) =>
        d
          .addOptions({ block: 'Swatch block', list: 'Bulleted list of hex codes', inline: 'Hex codes on one line' })
          .setValue(this.plugin.settings.insertFormat)
          .onChange(async (v) => {
            this.plugin.settings.insertFormat = v as InsertFormat;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Copy colours as')
      .setDesc('Format used when you click a swatch.')
      .addDropdown((d) =>
        d
          .addOptions({ hex: 'HEX', rgb: 'RGB', hsl: 'HSL', oklch: 'OKLCH' })
          .setValue(this.plugin.settings.copyFormat)
          .onChange(async (v) => {
            this.plugin.settings.copyFormat = v as CopyFormat;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Default palette size')
      .setDesc('Number of swatches the generator starts with.')
      .addDropdown((d) =>
        d
          .addOptions(Object.fromEntries([3, 4, 5, 6, 7, 8, 9, 10].map((n) => [String(n), `${n} colours`])))
          .setValue(String(this.plugin.settings.defaultSize))
          .onChange(async (v) => {
            this.plugin.settings.defaultSize = Number(v);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Show hex codes on swatches')
      .setDesc('Print each colour code under its stripe in rendered swatch blocks.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showLabels).onChange(async (v) => {
          this.plugin.settings.showLabels = v;
          await this.plugin.saveSettings();
          this.plugin.refreshBlocks();
        }),
      );
  }
}
