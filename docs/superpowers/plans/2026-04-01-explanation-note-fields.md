# Explanation + Note Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse and display `explanation` and `note` from flat JSON quiz files as two distinct UI elements shown after a question is answered.

**Architecture:** Three targeted changes — extend the `RawFlatQuestion` and `Question` types, update all three flat parsers to map the new fields, and render a `Note` callout beneath the existing `Explanation` block in the question renderer.

**Tech Stack:** TypeScript, Next.js 15, React 19, Tailwind CSS, lucide-react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `types/question.ts` | Modify | Add `explanation?: string` to `RawFlatQuestion`; add `note?: string` to `Question` |
| `lib/parsers/json-parser.ts` | Modify | Use `raw.explanation` in all three flat parsers; spread `raw.note` when present |
| `components/study/question-renderer.tsx` | Modify | Render a `Note` callout after the `Explanation` block |

---

## Task 1: Extend the Type Definitions

**Files:**
- Modify: `types/question.ts`

- [ ] **Step 1: Add `explanation` to `RawFlatQuestion` and `note` to `Question`**

Open `types/question.ts`. Make exactly two edits:

**Edit 1** — add `explanation?: string` to `RawFlatQuestion` (line ~103):

```ts
export interface RawFlatQuestion {
  question: string;
  type?: 'single' | 'multiple' | 'matching';
  options: string[];
  source_page?: number;
  chapter: string;
  answer: string | string[] | Record<string, string>;
  note?: string;
  explanation?: string;           // ← add this line
  match_targets?: Record<string, string>;
}
```

**Edit 2** — add `note?: string` to `Question` (line ~23):

```ts
export interface Question {
  id: string;
  text: string;
  questionType: QuestionType;
  choices: QuestionChoice[];
  explanation: string;
  note?: string;                  // ← add this line
  category: string;
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
  matchOptions?: string[];
  module?: string;
}
```

- [ ] **Step 2: Run type-check to verify types compile**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add types/question.ts
git commit -m "feat(types): add explanation to RawFlatQuestion and note to Question"
```

---

## Task 2: Update the Flat Parsers

**Files:**
- Modify: `lib/parsers/json-parser.ts`

Three parsers need updating: `parseFlatSingle`, `parseFlatMultiple`, and `parseFlatMatching`. In each one, replace `explanation: raw.note || ''` with `explanation: raw.explanation || ''` and add `...(raw.note ? { note: raw.note } : {})`.

- [ ] **Step 1: Update `parseFlatSingle`**

Find the returned object inside `parseFlatSingle` (around line 197) and replace it:

```ts
  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.MULTIPLE_CHOICE,
    choices,
    explanation: raw.explanation || '',
    ...(raw.note ? { note: raw.note } : {}),
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
    ...(moduleName ? { module: moduleName } : {}),
  };
```

- [ ] **Step 2: Update `parseFlatMultiple`**

Find the returned object inside `parseFlatMultiple` (around line 231) and replace it:

```ts
  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.MULTI_SELECT,
    choices,
    explanation: raw.explanation || '',
    ...(raw.note ? { note: raw.note } : {}),
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
    ...(moduleName ? { module: moduleName } : {}),
  };
```

- [ ] **Step 3: Update `parseFlatMatching` — Format B early return**

Find the early `return` inside `parseFlatMatching` for Format B (around line 294) and replace it:

```ts
    return {
      id: crypto.randomUUID(),
      text: raw.question,
      questionType: QuestionType.MATCHING,
      choices: termChoices,
      matchOptions: raw.options,
      explanation: raw.explanation || '',
      ...(raw.note ? { note: raw.note } : {}),
      category,
      difficulty: Difficulty.MEDIUM,
      createdAt: now,
      updatedAt: now,
      ...(moduleName ? { module: moduleName } : {}),
    };
```

- [ ] **Step 4: Update `parseFlatMatching` — Format A final return**

Find the final `return` at the bottom of `parseFlatMatching` (around line 314) and replace it:

```ts
  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.SORTING,
    choices,
    explanation: raw.explanation || '',
    ...(raw.note ? { note: raw.note } : {}),
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
    ...(moduleName ? { module: moduleName } : {}),
  };
```

- [ ] **Step 5: Run type-check to verify parsers compile**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add lib/parsers/json-parser.ts
git commit -m "feat(parser): map explanation and note fields from flat JSON questions"
```

---

## Task 3: Render the Note Callout in the UI

**Files:**
- Modify: `components/study/question-renderer.tsx`

- [ ] **Step 1: Add `Pin` to the lucide-react import**

Find the existing import at the top of `question-renderer.tsx`:

```ts
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';
```

Replace it with:

```ts
import { CheckCircle2, XCircle, BookOpen, Pin } from 'lucide-react';
```

- [ ] **Step 2: Add the Note callout after the Explanation block**

Find the closing of the Explanation block (around line 358):

```tsx
        {/* Explanation */}
        {(isSubmitted || isViewOnly) && question.explanation && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="mb-1 font-semibold">Explanation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
```

Add the Note callout **immediately after** that block, before `</CardContent>`:

```tsx
        {/* Note */}
        {(isSubmitted || isViewOnly) && question.note && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <Pin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs italic text-muted-foreground leading-relaxed">
                {question.note}
              </p>
            </div>
          </div>
        )}
```

- [ ] **Step 3: Run type-check**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run build to verify no runtime issues**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npx next build
```

Expected: build completes successfully with no errors.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu"
git add components/study/question-renderer.tsx
git commit -m "feat(ui): render note callout below explanation in question renderer"
```

---

## Task 4: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
cd "C:\Users\User\Desktop\DL_Helpers\autodownload\MaiKiasu" && npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Re-import the IoT quiz JSON**

Navigate to the Questions page, use the import control to re-import `iot_weekly_quiz_with_answers.json`.

> ⚠️ Previously imported questions won't have `explanation`/`note` — you need to re-import to see the new fields. If duplicates are blocked, clear storage first or use a fresh import session.

- [ ] **Step 3: Verify explanation renders**

Start a study session. Answer any question and submit. Confirm the **Explanation** block appears with the full educational text (e.g., *"This is false because IoT design is always a tradeoff…"*).

- [ ] **Step 4: Verify note renders on a question that has one**

The second question (*"Which of the following technology uses 2.4Ghz frequency?"*) has both an `explanation` and a `note`. Answer and submit it. Confirm:
- Explanation block shows: *"Bluetooth/BLE, ZigBee, WirelessHART, and Wi-Fi all commonly use the 2.4 GHz ISM band…"*
- Note callout shows (smaller, italic, with pin icon): *"PDF annotation says 'Lora not in the notes but gives correct answer'."*

- [ ] **Step 5: Verify questions without a note show no note callout**

Answer question 1 (*"The various factors…"*) — it has an explanation but no note. Confirm only the Explanation block appears; no Note callout.
