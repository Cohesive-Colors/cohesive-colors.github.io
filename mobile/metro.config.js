// Metro config that lets the app import the website's code directly.
//
// `@/…` resolves to ../src (the Astro site), so the colour engine, the feed
// logic, the curated palettes and the Firebase like/publish code exist once
// and are shared by both apps. Three web-only modules are swapped for mobile
// versions (see OVERRIDES), and bare imports made from ../src are resolved
// against this folder's node_modules — the site's own node_modules is a
// different React/zustand install, and two copies of React break hooks.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const siteSrc = path.resolve(projectRoot, '..', 'src');

const OVERRIDES = {
  '@/lib/firebase/config': path.join(projectRoot, 'src/shims/firebase-config.ts'),
  '@/lib/firebase/client': path.join(projectRoot, 'src/shims/firebase-client.ts'),
  '@/store/useAppStore': path.join(projectRoot, 'src/store/useAppStore.ts'),
};

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), siteSrc];

const isBare = (name) => !name.startsWith('.') && !name.startsWith('/') && !name.startsWith('@/') && !name.startsWith('~/');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (OVERRIDES[moduleName]) {
    return { type: 'sourceFile', filePath: OVERRIDES[moduleName] };
  }
  if (moduleName.startsWith('@/')) {
    return context.resolveRequest(context, path.join(siteSrc, moduleName.slice(2)), platform);
  }
  if (moduleName.startsWith('~/')) {
    return context.resolveRequest(context, path.join(projectRoot, 'src', moduleName.slice(2)), platform);
  }
  if (isBare(moduleName) && context.originModulePath.startsWith(siteSrc + path.sep)) {
    // Pretend the import came from inside this app so it finds our node_modules.
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'package.json') },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
