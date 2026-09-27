---
name: add-setting
description: Checklist for adding a new plugin/board setting to Kanban Starlane — type, key registry, default, settings UI control, usage, tests. Use whenever a feature needs a new user-configurable option.
---

# Add a setting

Settings exist on two levels with the same keys: global (plugin `data.json`, settings tab) and
per board (JSON in the board's settings footer, board settings modal). The board value wins.

1. **Key and type** — `src/settings/types.ts`:
   - add `'my-setting'?: <type>` to `KanbanSettings` (kebab-case keys);
   - add the key to `settingKeyLookup` (otherwise it is not read from frontmatter).
   - If changing it must re-parse cards (affects how markdown is interpreted), add it to
     `shouldRefreshBoard`.
2. **Default** — if it has one, add it to `src/state/compileSettings.ts`
   (`raw('my-setting') ?? default`). Constants shared with the UI go in `settings/defaults.ts`.
3. **UI** — add a control in `src/settings/sections.ts` in the right section using the
   builders in `src/settings/controls.ts` (`toggleSetting`, `dropdownSetting`,
   `numberSetting`, `textSetting`, `overrideTextSetting`, `momentFormatSetting`). Use the same
   `defaultValue` as in step 2. Texts via `t()` + keys in `lang/locale/en.ts` and `ru.ts`.
4. **Use it** — components: `stateManager.useSetting('my-setting')` (re-renders on change);
   non-UI code: `stateManager.getSetting('my-setting')`.
5. **Tests**
   - unit: `tests/unit/state/compileSettings.test.ts` for the default/resolution; behaviour via
     `loadBoard(md, { globalSettings: {...} })` or the settings JSON in `board(..., settings)`;
   - e2e when it changes the UI: toggle it in the board settings modal
     (see `tests/e2e/specs/settings.e2e.ts`) and assert the effect.
6. **Docs** — `CHANGELOG.md` (*Added*); if it affects the file format, `board-format.md`.
