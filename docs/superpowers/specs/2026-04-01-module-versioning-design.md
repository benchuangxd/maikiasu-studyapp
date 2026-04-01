# Design: Module Versioning + Auto-Reimport

**Date:** 2026-04-01
**Status:** Approved

## Background

The app serves quiz question modules as static JSON files from `public/modules/`. A module is fetched and parsed on first load; the result is stored in localStorage. Subsequent app starts skip the fetch if the module is already marked as loaded in `maikiasu:loaded-modules`.

This means when the source JSON is updated (e.g. `iot_weekly_quiz_with_answers.json` gained `explanation` and `note` fields), users who already loaded the module continue to see stale data. There is no automatic mechanism to pick up the new content.

Additionally, `public/modules/iot.json` is currently out of sync with `iot_weekly_quiz_with_answers.json` (the canonical source at the project root):
- `public/modules/iot.json` — 2770 lines, no `explanation`/`note` fields
- `iot_weekly_quiz_with_answers.json` — 2972 lines, has `explanation` and `note` fields

## Goal

1. Sync `public/modules/iot.json` with `iot_weekly_quiz_with_answers.json` (one-time).
2. Add a `version` string to each module definition. When the stored version for a module differs from the current version, force-reload that module on next app start.

## Changes

### 1. `lib/config/modules.ts`

Add `version: string` to `ModuleDefinition` and set initial versions for both modules:

```ts
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  file: string;
  version: string;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'iot',
    name: 'IoT Communications',
    description: 'Internet of Things — weekly quiz questions covering protocols, hardware, and networking.',
    file: '/modules/iot.json',
    version: '2026-04-01',
  },
  {
    id: 'psd',
    name: 'Professional Software Dev',
    description: 'Professional software development concepts, methodologies, and best practices.',
    file: '/modules/psd.json',
    version: '2026-04-01',
  },
];
```

### 2. `lib/storage/local-storage.ts`

Add `MODULE_VERSIONS` to `STORAGE_KEYS`. This key stores `Record<moduleId, string>` — the version string that was current when each module was last loaded.

```ts
export const STORAGE_KEYS = {
  QUESTIONS: 'maikiasu:questions',
  REVIEW_METADATA: 'maikiasu:review-metadata',
  SESSIONS: 'maikiasu:sessions',
  SETTINGS: 'maikiasu:settings',
  ACTIVE_SESSION: 'maikiasu:active-session',
  LOADED_MODULES: 'maikiasu:loaded-modules',
  MODULE_VERSIONS: 'maikiasu:module-versions',  // ← add
} as const;
```

Kept separate from `LOADED_MODULES` to preserve backward compatibility (existing `LOADED_MODULES` entries remain valid).

### 3. `app/page.tsx`

**Change 1 — `loadModule`:** After a successful load, write `mod.version` into `MODULE_VERSIONS` storage.

```ts
// Inside loadModule, after questionsStorage.set(next):
const moduleVersionsStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.MODULE_VERSIONS);
const storedVersions = moduleVersionsStorage.get() ?? {};
moduleVersionsStorage.set({ ...storedVersions, [mod.id]: mod.version });
```

This applies to both the `reload` and normal load paths.

**Change 2 — startup `useEffect`:** Replace the existing "load if not in loadedMods" check with a check that also catches version mismatches:

```ts
const moduleVersionsStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.MODULE_VERSIONS);
const storedVersions = moduleVersionsStorage.get() ?? {};

const needsLoad = MODULES.filter((m) => {
  const notLoaded = !loadedMods[m.id] || qs.filter((q) => q.module === m.id).length === 0;
  const staleVersion = storedVersions[m.id] !== m.version;
  return notLoaded || staleVersion;
});
```

For `staleVersion` cases, pass `reload = true` to `loadModule` so existing questions are replaced rather than deduplicated.

### 4. `public/modules/iot.json`

Replace contents with `iot_weekly_quiz_with_answers.json`. This is a one-time sync. After this change, the IoT module will have `explanation` and `note` fields on every question, and the version bump (`"2026-04-01"`) will cause the app to force-reload it on next visit.

## Data Flow on Startup

```
for each module:
  notLoaded = !loadedMods[mod.id] || no questions in storage for this module
  staleVersion = storedVersions[mod.id] !== mod.version

  if notLoaded  → loadModule(mod, reload=false)   // first-time import
  if staleVersion → loadModule(mod, reload=true)   // version changed, replace
  otherwise → skip (up to date)
```

## Future Usage

To force a reimport of any module, bump its `version` string in `lib/config/modules.ts` and redeploy. The app picks it up on next load automatically.

## Scope

- 4 files changed: `lib/config/modules.ts`, `lib/storage/local-storage.ts`, `app/page.tsx`, `public/modules/iot.json`
- No changes to parsers, types, or UI components
- Backward compatible: existing `LOADED_MODULES` data is preserved; `MODULE_VERSIONS` starts empty and fills in on next load
