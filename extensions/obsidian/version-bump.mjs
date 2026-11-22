// `npm version patch|minor|major` runs this: it copies the new version from
// package.json into manifest.json and records the minimum Obsidian version
// for it in versions.json, which older Obsidian builds use to pick a
// compatible release.
import { readFileSync, writeFileSync } from 'node:fs';

const targetVersion = process.env.npm_package_version;
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, 2) + '\n');
