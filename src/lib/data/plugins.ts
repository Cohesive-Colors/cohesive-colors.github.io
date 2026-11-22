/**
 * Every place Cohesive Colors runs outside this site, for the /plugins page.
 *
 * To publish one: set `status: 'available'` and its store `url`. The page
 * then shows an install button; until then the card says when to expect it.
 * Order inside a group is the order on the page.
 */
export type PluginStatus = 'available' | 'in-review' | 'soon' | 'planned';
export type PluginGroup = 'browser' | 'design' | 'app';
export type PluginIcon = 'browser' | 'design' | 'phone' | 'desktop' | 'notes';

export interface Plugin {
  id: string;
  name: string;
  /** Where it is installed from. */
  store: string;
  group: PluginGroup;
  icon: PluginIcon;
  status: PluginStatus;
  /** Store listing; required once status is 'available'. */
  url?: string;
  /** One or two sentences: what it does there that the site cannot. */
  summary: string;
  /** schema.org operatingSystem for the structured data. */
  os: string;
}

export const PLUGIN_GROUPS: { id: PluginGroup; title: string; intro: string }[] = [
  {
    id: 'browser',
    title: 'Browser extensions',
    intro: 'The generator in your toolbar, plus a tab that reads the palette of the page you are on.',
  },
  {
    id: 'design',
    title: 'Design tools',
    intro: 'Generate and insert cohesive palettes without leaving the canvas or your notes.',
  },
  {
    id: 'app',
    title: 'Apps',
    intro: 'The full palette feed and generator as a native app, with your saved palettes offline.',
  },
];

export const STATUS_LABEL: Record<PluginStatus, string> = {
  available: 'Available',
  'in-review': 'In review',
  soon: 'Coming soon',
  planned: 'Planned',
};

export const PLUGINS: Plugin[] = [
  {
    id: 'chrome',
    name: 'Chrome extension',
    store: 'Chrome Web Store',
    group: 'browser',
    icon: 'browser',
    status: 'soon',
    summary:
      'Generate palettes of 3 to 10 colours from the toolbar, extract the colours any website uses, and copy them as CSS, Tailwind or JSON.',
    os: 'Chrome',
  },
  {
    id: 'firefox',
    name: 'Firefox add-on',
    store: 'Firefox Add-ons',
    group: 'browser',
    icon: 'browser',
    status: 'soon',
    summary:
      'The same popup for Firefox: generator, palette extraction from the current page, 480 curated palettes and one-click export.',
    os: 'Firefox',
  },
  {
    id: 'edge',
    name: 'Edge add-on',
    store: 'Microsoft Edge Add-ons',
    group: 'browser',
    icon: 'browser',
    status: 'soon',
    summary: 'The Chrome extension packaged for Microsoft Edge, with the same features and the same privacy: nothing leaves your browser.',
    os: 'Microsoft Edge',
  },
  {
    id: 'figma',
    name: 'Figma plugin',
    store: 'Figma Community',
    group: 'design',
    icon: 'design',
    status: 'planned',
    summary: 'Generate a cohesive palette on the canvas and save it as colour styles or variables in one step.',
    os: 'Figma',
  },
  {
    id: 'penpot',
    name: 'Penpot plugin',
    store: 'Penpot plugins',
    group: 'design',
    icon: 'design',
    status: 'planned',
    summary: 'Palettes of any size from 3 to 10, added straight to your Penpot file library as shared colours.',
    os: 'Penpot',
  },
  {
    id: 'framer',
    name: 'Framer plugin',
    store: 'Framer Marketplace',
    group: 'design',
    icon: 'design',
    status: 'planned',
    summary: 'Build a palette, then turn it into Framer colour styles for your site without copying hex codes by hand.',
    os: 'Framer',
  },
  {
    id: 'obsidian',
    name: 'Obsidian plugin',
    store: 'Obsidian Community Plugins',
    group: 'design',
    icon: 'notes',
    status: 'soon',
    summary:
      'Generate or browse palettes without leaving your vault and keep them in notes as live swatch blocks you can click to copy.',
    os: 'Obsidian',
  },
  {
    id: 'android',
    name: 'Android app',
    store: 'Google Play',
    group: 'app',
    icon: 'phone',
    status: 'soon',
    summary: 'Browse the feed, generate palettes with locks and the cohesion slider, and keep saved palettes on your phone.',
    os: 'Android',
  },
  {
    id: 'windows',
    name: 'Windows app',
    store: 'Microsoft Store',
    group: 'app',
    icon: 'desktop',
    status: 'planned',
    summary: 'Cohesive Colors as an installable desktop app with its own window, offline saved palettes and quick export.',
    os: 'Windows',
  },
];
