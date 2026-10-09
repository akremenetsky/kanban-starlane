---
name: release
description: Steps to cut a Kanban Starlane release (version bump, changelog, tag, GitHub release via CI). Use ONLY when the product owner explicitly asks for a release.
---

# Release

Only when the product owner explicitly asks. Confirm the version number with them.

1. On an up-to-date `main` with a clean tree: `npm run check`, `E2E_VERSIONS=all npm run test:e2e`,
   and check that the latest *E2E on latest Obsidian* run is green.
2. Choose the version (semver; `0.x` while pre-1.0). If new Obsidian APIs are used, raise
   `minAppVersion` in `manifest.json` first and re-run e2e.
3. `npm version <x.y.z> --no-git-tag-version`, then `npm run bump`
   (updates `manifest.json`, `versions.json`, writes `release-notes.md` from git log).
4. Replace `release-notes.md` with the user-facing notes from `CHANGELOG.md` *Unreleased*;
   rename *Unreleased* to the version and date.
5. Commit `Release <x.y.z>`. **Ask before** `git tag <x.y.z> && git push && git push --tags`
   — the tag triggers `.github/workflows/release.yml`, which builds and publishes
   `main.js`, `manifest.json`, `styles.css`.
6. Community store submission (first release only) is a separate, manual process — ask.
