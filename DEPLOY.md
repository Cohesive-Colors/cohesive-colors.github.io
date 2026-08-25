# Deploying to GitHub Pages

Target origin: `https://cohesive-colors.github.io`

The site is fully static (531 pages, no server), so GitHub Pages serves it as
is. Likes and published palettes keep working because they talk to Firebase
directly from the browser.

## One prerequisite worth checking first

The address `cohesive-colors.github.io` is only available if a GitHub **user or
organisation is literally named `cohesive-colors`**, and the repository inside
it is named `cohesive-colors.github.io`. There is no other way to get that
hostname.

If the name is taken, or you would rather not create an organisation, the two
alternatives are:

- a custom domain such as `cohesivecolors.com`, pointed at Pages. Nothing in the
  code changes, only `site` in `astro.config.mjs` and a `public/CNAME` file.
- a project page at `anliberant.github.io/cohesive-colors`. This one **does**
  need code changes: `base` in `astro.config.mjs` plus every internal link,
  og:image path and sitemap entry. Tell me if you go this route.

The repository also has to be **public**, unless you have GitHub Pro or Team.

## 1. Create the repository and push

```powershell
cd C:\Users\anlib\Desktop\micro-projects\cohesive-colors

npm install          # required: esbuild and sharp were promoted to direct
                     # devDependencies, so package-lock.json must be rebuilt

git init
git add .
git commit -m "Cohesive Colors"
git branch -M main
git remote add origin https://github.com/cohesive-colors/cohesive-colors.github.io.git
git push -u origin main
```

`package-lock.json` must be committed. The workflow runs `npm ci`, which refuses
to install without it.

Nothing generated is committed: `dist/`, `public/social/`, `pinterest/` and
`.env` are all git-ignored. The 1920 social images are rebuilt during each
deploy, which takes about three minutes.

## 2. Turn Pages on

Repository **Settings > Pages > Build and deployment > Source**, choose
**GitHub Actions**. Do not pick "Deploy from a branch"; the workflow publishes
the artifact itself.

## 3. Add the Firebase config

Repository **Settings > Secrets and variables > Actions > Variables tab**, then
**New repository variable** for each of these five. Copy the values out of your
local `.env`.

| Name | Example |
| --- | --- |
| `PUBLIC_FIREBASE_API_KEY` | `AIza...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | `cohesive-colors.firebaseapp.com` |
| `PUBLIC_FIREBASE_DATABASE_URL` | `https://cohesive-colors-default-rtdb.firebaseio.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | `cohesive-colors` |
| `PUBLIC_FIREBASE_APP_ID` | `1:...:web:...` |

Variables, not secrets. These values ship to the browser by design and a secret
would be masked in the build logs for no benefit. The database is protected by
`database.rules.json`, not by hiding the config.

Leave them out and the site still builds and works, just with likes stored per
browser instead of shared.

## 4. Authorise the domain in Firebase

Anonymous sign-in is rejected from an unknown origin, which would silently break
likes on the live site while working fine on localhost.

Firebase console > **Authentication > Settings > Authorized domains > Add
domain**, enter `cohesive-colors.github.io`.

## 5. Watch the first deploy

The **Actions** tab shows the run. It type-checks, runs the 43 tests, generates
the images, builds, then runs the SEO audit before publishing, so a broken
canonical or a duplicate title fails the deploy rather than shipping.

Expect five to seven minutes for the first run and a little less afterwards
thanks to the npm cache.

## 6. Verify once it is live

- `https://cohesive-colors.github.io/` loads and the palette grid renders
- a palette page opens directly, for example from the sitemap
- like a palette, reload, and the count holds. If it resets, step 4 was missed
- `https://cohesive-colors.github.io/robots.txt` and `/sitemap-index.xml` resolve
- an unknown URL shows the 404 page
- view source on a palette page: `og:image` points at
  `https://cohesive-colors.github.io/social/...png`, not localhost

## 7. Then, for traffic

**Google Search Console.** Add the property, verify by DNS or the HTML file, and
submit `https://cohesive-colors.github.io/sitemap-index.xml`. 529 URLs.

**Pinterest.** Claim the site first, otherwise pins do not carry your attribution
and Rich Pins stay off. Pinterest gives you a meta tag; it goes in the `<head>`
in `src/layouts/Layout.astro`. Then run the Rich Pins validator against any
palette URL. Palette pages already declare `og:type=article`, so they should
validate without further changes.

**Bulk pins.** Once the site is live, regenerate the upload files:

```powershell
npm run pins:csv
```

They now default to the production origin, so no environment variable is needed.
1440 rows land in `pinterest/`, three layout variants for each of the 480
palettes, spaced out over time so an upload does not read as spam.

## Redeploying

Push to `main`. That is the whole flow. To republish without a code change, use
**Actions > Deploy to GitHub Pages > Run workflow**.

## Moving to a custom domain later

1. `public/CNAME` containing the bare domain, for example `cohesivecolors.com`
2. change the default `site` in `astro.config.mjs`
3. point DNS at GitHub Pages and enable it under Settings > Pages
4. re-run `npm run pins:csv` and resubmit the sitemap

Every absolute URL on the site derives from `site`, so those two file changes
cover canonical tags, og:image, the sitemap, robots.txt and llms.txt.
