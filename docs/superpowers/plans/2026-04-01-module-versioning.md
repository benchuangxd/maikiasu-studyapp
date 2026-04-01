# Module Versioning + Auto-Reimport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `version` field to module definitions so the app automatically force-reloads a module when its version changes, and sync `public/modules/iot.json` with the latest `iot_weekly_quiz_with_answers.json`.

**Architecture:** A `version` string on each `ModuleDefinition` is compared against a stored version in a new `maikiasu:module-versions` localStorage key on every app start. Mismatches trigger a force-reload (same logic as the existing manual reload button). The IoT JSON is synced once as part of this change.

**Tech Stack:** TypeScript, Next.js 15, React 19, localStorage

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `public/modules/iot.json` | Replace | Sync with latest `iot_weekly_quiz_with_answers.json` |
| `lib/config/modules.ts` | Modify | Add `version: string` to `ModuleDefinition`; set initial versions |
| `lib/storage/local-storage.ts` | Modify | Add `MODULE_VERSIONS` storage key |
| `app/page.tsx` | Modify | Persist version in `loadModule`; detect version mismatches on startup |

---

## Task 1: Sync `public/modules/iot.json`

**Files:**
- Replace: `public/modules/iot.json` (copy from `iot_weekly_quiz_with_answers.json`)

- [ ] **Step 1: Copy the source file over the module file**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
cp iot_weekly_quiz_with_answers.json public/modules/iot.json
```

- [ ] **Step 2: Verify the copy succeeded**

```bash
wc -l public/modules/iot.json iot_weekly_quiz_with_answers.json
```

Expected: both files show the same line count (2972 lines).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add public/modules/iot.json
git commit -m "chore(data): sync public/modules/iot.json with latest source (adds explanation+note fields)"
```

---

## Task 2: Add `version` to `ModuleDefinition`

**Files:**
- Modify: `lib/config/modules.ts`

- [ ] **Step 1: Add `version` to the interface and both module entries**

Replace the entire contents of `lib/config/modules.ts` with:

```ts
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  file: string; // path relative to public/
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

- [ ] **Step 2: Run type-check**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx tsc --noEmit
```

Expected: no errors. (The new `version` field is additive — no existing consumers break because `ModuleDefinition` is only constructed here and read elsewhere.)

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add lib/config/modules.ts
git commit -m "feat(config): add version field to ModuleDefinition"
```

---

## Task 3: Add `MODULE_VERSIONS` Storage Key

**Files:**
- Modify: `lib/storage/local-storage.ts`

- [ ] **Step 1: Add `MODULE_VERSIONS` to `STORAGE_KEYS`**

Find the `STORAGE_KEYS` object (line 50) and add the new key:

```ts
export const STORAGE_KEYS = {
  QUESTIONS: 'maikiasu:questions',
  REVIEW_METADATA: 'maikiasu:review-metadata',
  SESSIONS: 'maikiasu:sessions',
  SETTINGS: 'maikiasu:settings',
  ACTIVE_SESSION: 'maikiasu:active-session',
  LOADED_MODULES: 'maikiasu:loaded-modules',
  MODULE_VERSIONS: 'maikiasu:module-versions',
} as const;
```

- [ ] **Step 2: Run type-check**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add lib/storage/local-storage.ts
git commit -m "feat(storage): add MODULE_VERSIONS storage key"
```

---

## Task 4: Wire Up Version Persistence and Startup Detection

**Files:**
- Modify: `app/page.tsx`

This task makes two changes to `page.tsx`:
1. Add a module-level `moduleVersionsStorage` adapter alongside the existing ones.
2. In `loadModule`, persist `mod.version` to `MODULE_VERSIONS` after every successful load.
3. In the startup `useEffect`, expand the "needs load" check to include version mismatches and use a stale-aware load path.

- [ ] **Step 1: Add `moduleVersionsStorage` adapter at module level**

Find the existing storage adapters near the top of the file (around line 20):

```ts
// Storage adapters
const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);
const loadedModulesStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.LOADED_MODULES);
// loaded-modules value: Record<moduleId, loadedAt ISO string>
```

Replace with:

```ts
// Storage adapters
const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);
const loadedModulesStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.LOADED_MODULES);
// loaded-modules value: Record<moduleId, loadedAt ISO string>
const moduleVersionsStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.MODULE_VERSIONS);
// module-versions value: Record<moduleId, version string>
```

- [ ] **Step 2: Persist version in `loadModule` — reload path**

Find the reload path inside `loadModule` (the `if (reload)` block). After the `loadedModulesStorage.set(...)` call (around line 94), add two lines:

```ts
        const loadedAt = new Date().toISOString();
        const loadedMods = loadedModulesStorage.get() ?? {};
        loadedModulesStorage.set({ ...loadedMods, [mod.id]: loadedAt });
        // ↓ add these two lines
        const moduleVersions = moduleVersionsStorage.get() ?? {};
        moduleVersionsStorage.set({ ...moduleVersions, [mod.id]: mod.version });
        const modQuestions = next.filter((q) => q.module === mod.id);
```

- [ ] **Step 3: Persist version in `loadModule` — normal load path**

Find the normal load path (after the `if (reload)` block ends). After the `loadedModulesStorage.set(...)` call (around line 117), add two lines:

```ts
      const loadedAt = new Date().toISOString();
      const loadedMods = loadedModulesStorage.get() ?? {};
      loadedModulesStorage.set({ ...loadedMods, [mod.id]: loadedAt });
      // ↓ add these two lines
      const moduleVersions = moduleVersionsStorage.get() ?? {};
      moduleVersionsStorage.set({ ...moduleVersions, [mod.id]: mod.version });

      // Count categories for this module's new questions
```

- [ ] **Step 4: Replace the startup auto-import block in `useEffect`**

Find this comment and the block that follows it (lines 186–226):

```ts
    // Auto-import any modules that haven't been loaded yet
    const notLoaded = MODULES.filter((m) => !loadedMods[m.id] || qs.filter((q) => q.module === m.id).length === 0);
    if (notLoaded.length > 0) {
      // Fire sequentially to avoid concurrent writes to localStorage
      (async () => {
        for (const mod of notLoaded) {
          await new Promise<void>((resolve) => {
            // We must access latest storage state each time
            const doLoad = async () => {
              const current = questionsStorage.get() ?? [];
              const lm = loadedModulesStorage.get() ?? {};
              updateModuleState(mod.id, { status: 'loading', error: undefined });
              try {
                const base = current.filter((q) => q.module !== mod.id);
                const { imported, errors } = await fetchAndParseModule(mod, base);
                const next = [...base, ...imported];
                questionsStorage.set(next);
                const loadedAt = new Date().toISOString();
                loadedModulesStorage.set({ ...lm, [mod.id]: loadedAt });
                const modQs = next.filter((q) => q.module === mod.id);
                const cats = new Set(modQs.map((q) => q.category)).size;
                updateModuleState(mod.id, {
                  status: 'loaded',
                  questionCount: modQs.length,
                  categories: cats,
                  loadedAt,
                  error: errors.length > 0 ? `${errors.length} question(s) skipped` : undefined,
                });
                setQuestions(next);
                setDueCount(getDueQuestions(next).length);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                updateModuleState(mod.id, { status: 'error', error: msg });
              }
              resolve();
            };
            doLoad();
          });
        }
      })();
    }
```

Replace the entire block with:

```ts
    // Auto-import modules that haven't been loaded or have a stale version
    const storedVersions = moduleVersionsStorage.get() ?? {};
    const needsLoad = MODULES.filter((m) => {
      const notLoaded = !loadedMods[m.id] || qs.filter((q) => q.module === m.id).length === 0;
      const staleVersion = storedVersions[m.id] !== m.version;
      return notLoaded || staleVersion;
    });
    if (needsLoad.length > 0) {
      // Fire sequentially to avoid concurrent writes to localStorage
      (async () => {
        for (const mod of needsLoad) {
          await new Promise<void>((resolve) => {
            // We must access latest storage state each time
            const doLoad = async () => {
              const current = questionsStorage.get() ?? [];
              const lm = loadedModulesStorage.get() ?? {};
              const mv = moduleVersionsStorage.get() ?? {};
              const isStale = !!lm[mod.id] && mv[mod.id] !== mod.version;
              updateModuleState(mod.id, { status: 'loading', error: undefined });
              try {
                let next: Question[];
                let imported: Question[];
                let errors: string[];
                if (isStale) {
                  // Force reload: strip old copies and replace with fresh questions
                  ({ imported, errors } = await fetchAndParseModule(mod, [], true));
                  const freshTexts = new Set(imported.map((q) => q.text));
                  const base = current.filter((q) => q.module !== mod.id && !freshTexts.has(q.text));
                  next = [...base, ...imported];
                } else {
                  // First-time load: deduplicate against existing questions
                  ({ imported, errors } = await fetchAndParseModule(mod, current));
                  next = [...current, ...imported];
                }
                questionsStorage.set(next);
                const loadedAt = new Date().toISOString();
                loadedModulesStorage.set({ ...lm, [mod.id]: loadedAt });
                moduleVersionsStorage.set({ ...mv, [mod.id]: mod.version });
                const modQs = next.filter((q) => q.module === mod.id);
                const cats = new Set(modQs.map((q) => q.category)).size;
                updateModuleState(mod.id, {
                  status: 'loaded',
                  questionCount: modQs.length,
                  categories: cats,
                  loadedAt,
                  error: errors.length > 0 ? `${errors.length} question(s) skipped` : undefined,
                });
                setQuestions(next);
                setDueCount(getDueQuestions(next).length);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                updateModuleState(mod.id, { status: 'error', error: msg });
              }
              resolve();
            };
            doLoad();
          });
        }
      })();
    }
```

- [ ] **Step 5: Run type-check**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run build**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx next build
```

Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add app/page.tsx
git commit -m "feat(app): auto-reload modules when version changes on startup"
```

---

## Task 5: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Verify auto-reload triggers for IoT module**

On the home page, the IoT module card should briefly show "Importing…" and then "Loaded" with the updated question count. This confirms the version mismatch was detected and a force-reload happened.

- [ ] **Step 3: Verify explanation appears in study session**

Navigate to a study session, answer the first question, and submit. Confirm the **Explanation** block appears with educational text (e.g., *"This is false because IoT design is always a tradeoff…"*).

- [ ] **Step 4: Verify reload does NOT happen on second visit**

Refresh the page. The IoT module card should show "Loaded" immediately without going through "Importing…" again. The version is now stored and matches, so no reload occurs.

- [ ] **Step 5: Verify future version bumps trigger reload**

In `lib/config/modules.ts`, temporarily change the IoT version to `'2026-04-02'`. Refresh the page. The IoT module should auto-reload (show "Importing…" briefly). Change it back to `'2026-04-01'` — another reload will trigger on next refresh. This confirms the mechanism works.

> After testing, restore version to `'2026-04-01'` if changed.
