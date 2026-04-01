# Design: Support `explanation` and `note` Fields from Flat JSON

**Date:** 2026-04-01
**Status:** Approved

## Background

The flat JSON quiz files (e.g., `iot_weekly_quiz_with_answers.json`) already contain two distinct informational fields per question:

- **`explanation`** — educational content explaining why an answer is correct or incorrect.
- **`note`** — editorial/raw annotations from the source material (e.g., "PDF annotation says this answer is debatable").

Currently, `RawFlatQuestion` has no `explanation` field, so explanations are silently discarded on import. The parser uses `raw.note || ''` for the `Question.explanation` field, which is also incorrect. The `Question` type has no `note` field at all.

The UI renderer already supports rendering `question.explanation` — it just never receives populated data.

## Goal

Parse and preserve both `explanation` and `note` from flat JSON files, and render them as distinct visual elements after a question is answered.

## Changes

### 1. `types/question.ts`

- Add `explanation?: string` to `RawFlatQuestion` so the parser can read it from JSON.
- Add `note?: string` to `Question` so the annotation is carried through to the UI.

```ts
// RawFlatQuestion — add:
explanation?: string;

// Question — add:
note?: string;
```

### 2. `lib/parsers/json-parser.ts`

In all three flat parsers (`parseFlatSingle`, `parseFlatMultiple`, `parseFlatMatching`):

- Change `explanation: raw.note || ''` → `explanation: raw.explanation || ''`
- Spread `note` onto the returned `Question` when present:

```ts
...(raw.note ? { note: raw.note } : {})
```

### 3. `components/study/question-renderer.tsx`

After the existing `Explanation` block, render a `Note` callout when `question.note` is truthy and the question is submitted or in view-only mode. Use a distinct visual style (muted background, pin icon, italic text) to differentiate it from the main explanation.

```tsx
{(isSubmitted || isViewOnly) && question.note && (
  <div className="rounded-lg border bg-muted/20 p-4">
    <div className="flex items-start gap-2">
      <Pin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-xs italic text-muted-foreground leading-relaxed">
        {question.note}
      </p>
    </div>
  </div>
)}
```

## Data Flow

```
JSON: { explanation: "...", note: "..." }
  → RawFlatQuestion.explanation / RawFlatQuestion.note
  → parser → Question.explanation / Question.note
  → QuestionRenderer → Explanation block + Note callout
```

## Scope

- 3 files changed: `types/question.ts`, `lib/parsers/json-parser.ts`, `components/study/question-renderer.tsx`
- No changes to storage, session logic, legacy format parsers, or any other files
- Backwards compatible: `explanation` and `note` are both optional; questions without them are unaffected

## Out of Scope

- Editing `note` or `explanation` fields in the UI
- Migrating previously imported questions (they will simply show no explanation/note until re-imported)
