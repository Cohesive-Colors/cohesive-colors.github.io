# Publishing the Obsidian plugin

Obsidian installs plugins from a GitHub repository whose **root** holds
`manifest.json`, `README.md` and `LICENSE`, and downloads `main.js`,
`manifest.json` and `styles.css` from that repository's GitHub releases. This
folder lives inside the website monorepo, so it is published to a repository
of its own: `Cohesive-Colors/cohesive-colors-obsidian`.

Plugin id: `cohesive-colors` (checked: unused in the community list as of
November 2026). It is permanent once published.

## 1. One-time setup

1. Lockfile (from the monorepo, on your own machine):

   ```powershell
   cd extensions/obsidian
   npm install          # creates package-lock.json; the release workflow needs it
   npm run lint         # expect 0 errors, 1 warning (settings search, see below)
   npm run build        # writes main.js (gitignored)
   cd ../..
   git add extensions/obsidian
   git commit -m "Obsidian plugin 1.0.0"
   git push
   ```

2. On GitHub, create an **empty public** repository
   `Cohesive-Colors/cohesive-colors-obsidian` (no README, no licence — they
   come from this folder).

3. Push this folder as the root of that repository:

   ```powershell
   git subtree split --prefix extensions/obsidian -b obsidian-plugin
   git push https://github.com/Cohesive-Colors/cohesive-colors-obsidian.git obsidian-plugin:main
   git branch -D obsidian-plugin
   ```

   Check on GitHub that `manifest.json` is at the top level of the new repo.

4. Add the release workflow to the plugin repository: on GitHub open
   `Cohesive-Colors/cohesive-colors-obsidian` → **Add file → Create new file**,
   name it `.github/workflows/release.yml`, paste the contents of
   `templates/release.yml`, and commit to `main`.

## 2. First release

Tag the plugin repository with the exact version from `manifest.json`
(`1.0.0`, no `v`). The workflow from step 1.4 builds and
creates a **draft** release with the three files:

```powershell
git clone https://github.com/Cohesive-Colors/cohesive-colors-obsidian.git ..\cohesive-colors-obsidian
cd ..\cohesive-colors-obsidian
git tag 1.0.0
git push origin 1.0.0
```

GitHub → Actions → wait for "Release plugin" to pass → Releases → open the
draft, add a short description, **Publish release**.

(Without the workflow: GitHub → Releases → *Draft a new release* → tag
`1.0.0` → attach `main.js`, `manifest.json`, `styles.css` from
`extensions/obsidian/` → Publish.)

## 3. Submit to the directory

1. Sign in at https://community.obsidian.md with your Obsidian account.
2. Link your GitHub account (it verifies you own the repository).
3. Add a plugin → choose `Cohesive-Colors/cohesive-colors-obsidian`.
   The directory reads `manifest.json` from the default branch, so it must be
   pushed first (step 1.3).
4. Review is automatic. If it reports problems, fix them, bump the version
   (section 4) and publish a new release; the plugin becomes installable once
   the automated review has no errors.
5. Optional but recommended: add a screenshot of a swatch block and the
   generator to `README.md` — the listing shows an excerpt of it.

After it is listed: announce it in the forum's *Share & showcase* and on the
Obsidian Discord, and set the `obsidian` entry in
`src/lib/data/plugins.ts` (website) to `status: 'available'` with the
directory URL.

## 4. Updates

In the monorepo:

```powershell
cd extensions/obsidian
npm version patch --no-git-tag-version   # 1.0.0 → 1.0.1 in package.json, manifest.json, versions.json
cd ../..
git commit -am "Obsidian plugin 1.0.1"
git push
git subtree split --prefix extensions/obsidian -b obsidian-plugin
git push https://github.com/Cohesive-Colors/cohesive-colors-obsidian.git obsidian-plugin:main
git branch -D obsidian-plugin
```

Then tag `1.0.1` in the plugin repository and publish the draft release as in
section 2. Users get the update from inside Obsidian.

After a change to the website's colour engine or curated palettes, run
`npm run sync-engine` here first and commit `src/engine/` with the version
bump.

## Known lint warning

`obsidianmd/settings-tab/prefer-setting-definitions`: the settings tab uses
the classic `display()` API so it works from Obsidian 1.7.2; the declarative
API only exists from 1.13. It is a recommendation, not a review error.
