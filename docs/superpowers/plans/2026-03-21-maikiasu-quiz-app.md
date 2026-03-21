# MaiKiasu Quiz App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side quiz learning app with JSON import, 3 question types, SM-2 spaced repetition, and statistics dashboard.

**Architecture:** Next.js 15 App Router with React 19, fully client-side (localStorage). Cherry-pick SM-2 algorithm and storage patterns from `C:\Users\User\Desktop\DL_Helpers\autodownload\learning-app` reference project.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Bun, Tailwind CSS v4, ShadCN/ui (new-york style), @dnd-kit, next-themes, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-21-maikiasu-quiz-app-design.md`

**Reference project:** `C:\Users\User\Desktop\DL_Helpers\autodownload\learning-app`

**IMPORTANT:** Use the `frontend-design` skill when building UI components for distinctive, polished visual design. Dark mode is the default theme.

---

## File Structure

```
MaiKiasu/
├── app/
│   ├── layout.tsx              # Root layout: metadata, ThemeProvider, Navbar
│   ├── page.tsx                # Home dashboard (client component)
│   ├── globals.css             # Tailwind v4 theme (dark-mode-first)
│   ├── questions/
│   │   └── page.tsx            # Question import & management
│   ├── study/
│   │   └── page.tsx            # Study mode selector & quiz runner
│   └── statistics/
│       └── page.tsx            # Progress tracking dashboard
├── components/
│   ├── layout/
│   │   ├── navbar.tsx          # Top nav with links + theme toggle
│   │   ├── footer.tsx          # Page footer
│   │   ├── theme-provider.tsx  # next-themes provider wrapper
│   │   └── theme-toggle.tsx    # Dark/light/system toggle button
│   ├── questions/
│   │   ├── question-import.tsx # JSON file upload + parsing UI
│   │   ├── question-list.tsx   # Display, filter, delete questions
│   │   └── export-import-controls.tsx # Full data backup/restore
│   ├── study/
│   │   ├── study-session.tsx   # Quiz runner (all 3 question types)
│   │   └── sortable-list.tsx   # @dnd-kit drag-drop for sorting Qs
│   ├── statistics/
│   │   └── stats-dashboard.tsx # Stats cards, topic breakdown, sessions
│   └── ui/                     # ShadCN components (CLI-installed)
├── lib/
│   ├── algorithms/
│   │   └── sm2.ts              # SM-2 spaced repetition algorithm
│   ├── storage/
│   │   └── local-storage.ts    # Type-safe localStorage adapter + keys
│   ├── services/
│   │   └── review-service.ts   # Review scheduling, stats aggregation
│   ├── parsers/
│   │   └── json-parser.ts      # Parse MaiKiasu JSON → internal model
│   └── utils/
│       ├── export-import.ts    # Full data backup/restore
│       └── utils.ts            # cn() helper (clsx + tailwind-merge)
├── types/
│   └── question.ts             # All TypeScript interfaces & enums
├── components.json             # ShadCN CLI config
├── next.config.ts              # Next.js config (standalone output)
├── tsconfig.json               # TypeScript strict config
├── postcss.config.mjs          # PostCSS with Tailwind v4
└── package.json                # Dependencies
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `components.json`, `app/globals.css`, `app/layout.tsx`, `lib/utils/utils.ts`

**Pre-condition:** The MaiKiasu directory already exists with `questions.json` and `docs/`. We will scaffold the Next.js project in-place, preserving existing files.

- [ ] **Step 1: Initialize Next.js project with Bun**

Run from MaiKiasu directory:
```bash
cd C:/Users/User/Desktop/DL_Helpers/autodownload/MaiKiasu
bun create next-app . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

Note: If the directory is not empty, you may need to use `--force` or initialize manually. The key files needed are: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.

- [ ] **Step 2: Update package.json with required dependencies**

Ensure `package.json` has these dependencies (update versions to latest stable):

```json
{
  "name": "maikiasu",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.553.0",
    "next": "^15.5.7",
    "next-themes": "^0.4.6",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0-alpha.25",
    "@types/node": "^22.19.0",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "eslint": "^9",
    "eslint-config-next": "^15.0.0",
    "tailwindcss": "^4.0.0-alpha.25",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}
```

Run: `bun install`

- [ ] **Step 3: Initialize ShadCN**

Create `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {}
}
```

Install ShadCN components needed:
```bash
bunx --bun shadcn@latest add button card input label dialog alert badge progress radio-group dropdown-menu textarea
```

- [ ] **Step 4: Create utils.ts**

Create `lib/utils/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

Note: ShadCN expects this at `lib/utils.ts` based on the alias — check that the `@/lib/utils` alias resolves. You may need to create a re-export at `lib/utils.ts` that does `export { cn } from './utils/utils'`, or just place cn directly in `lib/utils.ts` and skip the utils subdirectory.

- [ ] **Step 5: Set up globals.css with dark-mode-first theme**

Write `app/globals.css` — adapt from reference project's globals.css but with dark mode as default. Copy the full CSS from the reference `learning-app/app/globals.css` (the oklch-based theme variables) and ensure the `.dark` class variables are the default. Use `data-theme` attribute for theme switching with `next-themes`.

- [ ] **Step 6: Set up postcss.config.mjs**

Create `postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 7: Set up next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 8: Verify build**

Run: `bun run type-check && bun run build`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js 15 project with ShadCN, Tailwind v4, dark mode theme"
```

---

## Task 2: TypeScript Types & Enums

**Files:**
- Create: `types/question.ts`

- [ ] **Step 1: Create type definitions**

Create `types/question.ts`:
```typescript
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SORTING = 'sorting',
  FILL_IN_BLANK = 'fill_in_blank',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface QuestionChoice {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  correctOrder?: number;
}

export interface Question {
  id: string;
  text: string;
  questionType: QuestionType;
  choices: QuestionChoice[];
  explanation: string;
  category: string;
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewMetadata {
  questionId: string;
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewed?: string;
}

export interface StudySession {
  id: string;
  date: string;
  topic: string | 'mixed';
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  duration: number;
}

/** Raw JSON input types for the MaiKiasu question format */
export interface RawQuestion {
  id: number;
  type?: 'sorting' | 'fill_in_blank';
  question: string;
  options?: string[];
  correct?: number;
  correctOrder?: number[];
  answer?: string;
  rationale: string;
}

export interface RawTopic {
  name: string;
  icon: string;
  questions: RawQuestion[];
}

export interface RawQuestionFile {
  topics: Record<string, RawTopic>;
}
```

- [ ] **Step 2: Verify types compile**

Run: `bun run type-check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add types/question.ts
git commit -m "feat: add TypeScript types for questions, reviews, sessions, and raw JSON format"
```

---

## Task 3: Core Library — localStorage Adapter

**Files:**
- Create: `lib/storage/local-storage.ts`

- [ ] **Step 1: Create localStorage adapter**

Create `lib/storage/local-storage.ts` — adapted from reference `learning-app/lib/storage/local-storage.ts`:

```typescript
export class LocalStorageAdapter<T> {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  get(): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(this.key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading localStorage (${this.key}):`, error);
      return null;
    }
  }

  /** Returns true if successful, false if quota exceeded or other error.
   *  Callers should check the return value and show a user-facing error on false. */
  set(value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Export data and clear old questions.');
      } else {
        console.error(`Error writing localStorage (${this.key}):`, error);
      }
      return false;
    }
  }

  remove(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error(`Error removing localStorage (${this.key}):`, error);
    }
  }

  exists(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.key) !== null;
  }
}

export const STORAGE_KEYS = {
  QUESTIONS: 'maikiasu:questions',
  REVIEW_METADATA: 'maikiasu:review-metadata',
  SESSIONS: 'maikiasu:sessions',
  SETTINGS: 'maikiasu:settings',
} as const;
```

- [ ] **Step 2: Verify**

Run: `bun run type-check`

- [ ] **Step 3: Commit**

```bash
git add lib/storage/local-storage.ts
git commit -m "feat: add type-safe localStorage adapter with MaiKiasu storage keys"
```

---

## Task 4: Core Library — SM-2 Algorithm

**Files:**
- Create: `lib/algorithms/sm2.ts`

- [ ] **Step 1: Create SM-2 algorithm**

Create `lib/algorithms/sm2.ts` — adapted from reference `learning-app/lib/algorithms/sm2.ts`. Uses ISO date strings instead of Date objects to match our data model:

```typescript
export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export interface SM2Input {
  easeFactor: number;
  interval: number;
  repetitions: number;
  quality: number;
}

export function calculateSM2({ easeFactor, interval, repetitions, quality }: SM2Input): SM2Result {
  const q = Math.max(0, Math.min(5, quality));

  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (q >= 3) {
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

export function getQualityRating(isCorrect: boolean): number {
  return isCorrect ? 4 : 0;
}

export function isDueForReview(nextReviewDate: string, currentDate: Date = new Date()): boolean {
  return currentDate >= new Date(nextReviewDate);
}

export function getInitialReviewMetadata(): SM2Result {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Verify**

Run: `bun run type-check`

- [ ] **Step 3: Commit**

```bash
git add lib/algorithms/sm2.ts
git commit -m "feat: add SM-2 spaced repetition algorithm (adapted from learning-app)"
```

---

## Task 5: Core Library — JSON Parser

**Files:**
- Create: `lib/parsers/json-parser.ts`

- [ ] **Step 1: Create JSON parser**

Create `lib/parsers/json-parser.ts`:

```typescript
import type {
  Question,
  QuestionChoice,
  RawQuestionFile,
  RawQuestion,
} from '@/types/question';
import { QuestionType, Difficulty } from '@/types/question';

export interface ParseResult {
  questions: Question[];
  topicCount: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

function generateLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

function parseMultipleChoice(
  raw: RawQuestion,
  category: string,
  now: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (raw.correct === undefined || raw.correct < 0 || raw.correct >= raw.options.length) return null;

  const labels = generateLabels(raw.options.length);
  const choices: QuestionChoice[] = raw.options.map((text, i) => ({
    id: crypto.randomUUID(),
    label: labels[i],
    text,
    isCorrect: i === raw.correct,
  }));

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.MULTIPLE_CHOICE,
    choices,
    explanation: raw.rationale || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
  };
}

function parseSorting(
  raw: RawQuestion,
  category: string,
  now: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (!raw.correctOrder || raw.correctOrder.length !== raw.options.length) return null;

  const choices: QuestionChoice[] = raw.options.map((text, i) => ({
    id: crypto.randomUUID(),
    label: String(i + 1),
    text,
    isCorrect: true,
    correctOrder: raw.correctOrder![i],
  }));

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.SORTING,
    choices,
    explanation: raw.rationale || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
  };
}

function parseFillInBlank(
  raw: RawQuestion,
  category: string,
  now: string,
): Question | null {
  if (!raw.answer) return null;

  const choices: QuestionChoice[] = [{
    id: crypto.randomUUID(),
    label: 'A',
    text: raw.answer,
    isCorrect: true,
  }];

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.FILL_IN_BLANK,
    choices,
    explanation: raw.rationale || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseQuestionsFromJSON(
  data: RawQuestionFile,
  existingQuestions: Question[] = [],
): ParseResult {
  const errors: string[] = [];
  const questions: Question[] = [];
  const existingTexts = new Set(existingQuestions.map((q) => q.text));
  const now = new Date().toISOString();
  let skippedCount = 0;

  if (!data.topics || typeof data.topics !== 'object') {
    return { questions: [], topicCount: 0, importedCount: 0, skippedCount: 0, errors: ['Invalid JSON: missing "topics" object at root'] };
  }

  const topicKeys = Object.keys(data.topics);

  for (const topicKey of topicKeys) {
    const topic = data.topics[topicKey];
    if (!topic.questions || !Array.isArray(topic.questions)) {
      errors.push(`Topic "${topic.name || topicKey}": missing questions array`);
      continue;
    }

    for (const raw of topic.questions) {
      if (!raw.question) {
        errors.push(`Topic "${topic.name}", question ${raw.id}: missing question text`);
        skippedCount++;
        continue;
      }

      if (existingTexts.has(raw.question)) {
        skippedCount++;
        continue;
      }

      let parsed: Question | null = null;

      if (raw.type === 'sorting') {
        parsed = parseSorting(raw, topic.name, now);
      } else if (raw.type === 'fill_in_blank') {
        parsed = parseFillInBlank(raw, topic.name, now);
      } else {
        parsed = parseMultipleChoice(raw, topic.name, now);
      }

      if (parsed) {
        questions.push(parsed);
        existingTexts.add(raw.question);
      } else {
        errors.push(`Topic "${topic.name}", question ${raw.id}: invalid structure for type "${raw.type || 'multiple_choice'}"`);
        skippedCount++;
      }
    }
  }

  return {
    questions,
    topicCount: topicKeys.length,
    importedCount: questions.length,
    skippedCount,
    errors,
  };
}
```

- [ ] **Step 2: Verify**

Run: `bun run type-check`

- [ ] **Step 3: Commit**

```bash
git add lib/parsers/json-parser.ts
git commit -m "feat: add JSON parser for MaiKiasu question format (MC, sorting, fill-in-blank)"
```

---

## Task 6: Core Library — Review Service

**Files:**
- Create: `lib/services/review-service.ts`

- [ ] **Step 1: Create review service**

Create `lib/services/review-service.ts` — adapted from reference `learning-app/lib/services/review-service.ts`, using ISO date strings:

```typescript
import type { Question, ReviewMetadata } from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import {
  calculateSM2,
  getInitialReviewMetadata,
  isDueForReview,
  getQualityRating,
} from '@/lib/algorithms/sm2';

const reviewStorage = new LocalStorageAdapter<Record<string, ReviewMetadata>>(
  STORAGE_KEYS.REVIEW_METADATA
);

export function getReviewMetadata(questionId: string): ReviewMetadata {
  const allMetadata = reviewStorage.get() ?? {};
  const metadata = allMetadata[questionId];

  if (metadata) {
    return metadata;
  }

  const initial = getInitialReviewMetadata();
  return {
    questionId,
    easinessFactor: initial.easeFactor,
    interval: initial.interval,
    repetitions: initial.repetitions,
    nextReviewDate: initial.nextReviewDate,
  };
}

export function updateReviewMetadata(
  questionId: string,
  isCorrect: boolean,
): ReviewMetadata {
  const currentMetadata = getReviewMetadata(questionId);
  const quality = getQualityRating(isCorrect);

  const result = calculateSM2({
    easeFactor: currentMetadata.easinessFactor,
    interval: currentMetadata.interval,
    repetitions: currentMetadata.repetitions,
    quality,
  });

  const newMetadata: ReviewMetadata = {
    questionId,
    easinessFactor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    nextReviewDate: result.nextReviewDate,
    lastReviewed: new Date().toISOString(),
  };

  const allMetadata = reviewStorage.get() ?? {};
  allMetadata[questionId] = newMetadata;
  reviewStorage.set(allMetadata);

  return newMetadata;
}

export function getDueQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => {
    const metadata = getReviewMetadata(question.id);
    if (!metadata.lastReviewed) return true; // New questions are always due
    return isDueForReview(metadata.nextReviewDate);
  });
}

export function getNewQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => {
    const metadata = getReviewMetadata(question.id);
    return !metadata.lastReviewed;
  });
}

export function getReviewStats(questions: Question[]): {
  total: number;
  new: number;
  learning: number;
  review: number;
  due: number;
} {
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let dueCount = 0;

  for (const question of questions) {
    const metadata = getReviewMetadata(question.id);

    if (!metadata.lastReviewed) {
      newCount++;
      dueCount++;
    } else if (metadata.repetitions < 2) {
      learningCount++;
      if (isDueForReview(metadata.nextReviewDate)) {
        dueCount++;
      }
    } else {
      reviewCount++;
      if (isDueForReview(metadata.nextReviewDate)) {
        dueCount++;
      }
    }
  }

  return { total: questions.length, new: newCount, learning: learningCount, review: reviewCount, due: dueCount };
}

export function resetAllReviews(): void {
  reviewStorage.set({});
}
```

- [ ] **Step 2: Verify**

Run: `bun run type-check`

- [ ] **Step 3: Commit**

```bash
git add lib/services/review-service.ts
git commit -m "feat: add review service with SM-2 scheduling and statistics"
```

---

## Task 7: Core Library — Export/Import Utility

**Files:**
- Create: `lib/utils/export-import.ts`

- [ ] **Step 1: Create export/import utility**

Create `lib/utils/export-import.ts`:

```typescript
import type { Question, ReviewMetadata, StudySession } from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';

interface ExportData {
  version: '1.0';
  exportDate: string;
  questions: Question[];
  reviewMetadata: Record<string, ReviewMetadata>;
  sessions: StudySession[];
}

export function exportAllData(): string {
  const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
  const reviewStorage = new LocalStorageAdapter<Record<string, ReviewMetadata>>(STORAGE_KEYS.REVIEW_METADATA);
  const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);

  const data: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    questions: questionsStorage.get() ?? [],
    reviewMetadata: reviewStorage.get() ?? {},
    sessions: sessionsStorage.get() ?? [],
  };

  return JSON.stringify(data, null, 2);
}

export function downloadExport(): void {
  const json = exportAllData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maikiasu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  questionsImported: number;
  questionsSkipped: number;
  metadataMerged: number;
  sessionsMerged: number;
}

export function importBackupData(json: string): ImportResult {
  const data: ExportData = JSON.parse(json);
  if (data.version !== '1.0') {
    throw new Error(`Unsupported backup version: ${data.version}`);
  }

  const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
  const reviewStorage = new LocalStorageAdapter<Record<string, ReviewMetadata>>(STORAGE_KEYS.REVIEW_METADATA);
  const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);

  // Merge questions (skip duplicates by text)
  const existing = questionsStorage.get() ?? [];
  const existingTexts = new Set(existing.map((q) => q.text));
  let questionsImported = 0;
  let questionsSkipped = 0;

  for (const q of data.questions) {
    if (existingTexts.has(q.text)) {
      questionsSkipped++;
    } else {
      existing.push(q);
      existingTexts.add(q.text);
      questionsImported++;
    }
  }
  questionsStorage.set(existing);

  // Merge review metadata (newer lastReviewed wins)
  const existingMeta = reviewStorage.get() ?? {};
  let metadataMerged = 0;
  for (const [id, meta] of Object.entries(data.reviewMetadata)) {
    const current = existingMeta[id];
    if (!current || (meta.lastReviewed && (!current.lastReviewed || meta.lastReviewed > current.lastReviewed))) {
      existingMeta[id] = meta;
      metadataMerged++;
    }
  }
  reviewStorage.set(existingMeta);

  // Merge sessions (add non-duplicate by ID)
  const existingSessions = sessionsStorage.get() ?? [];
  const existingSessionIds = new Set(existingSessions.map((s) => s.id));
  let sessionsMerged = 0;
  for (const session of data.sessions) {
    if (!existingSessionIds.has(session.id)) {
      existingSessions.push(session);
      sessionsMerged++;
    }
  }
  sessionsStorage.set(existingSessions);

  return { questionsImported, questionsSkipped, metadataMerged, sessionsMerged };
}
```

- [ ] **Step 2: Verify**

Run: `bun run type-check`

- [ ] **Step 3: Commit**

```bash
git add lib/utils/export-import.ts
git commit -m "feat: add data export/import with merge strategy for backups"
```

---

## Task 8: Layout Components (Navbar, Theme)

**Files:**
- Create: `components/layout/theme-provider.tsx`, `components/layout/theme-toggle.tsx`, `components/layout/navbar.tsx`, `components/layout/footer.tsx`
- Modify: `app/layout.tsx`

**IMPORTANT:** Use the `frontend-design` skill when building these UI components. Dark mode is the default.

- [ ] **Step 1: Create ThemeProvider**

Create `components/layout/theme-provider.tsx`:
```typescript
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 2: Create ThemeToggle**

Create `components/layout/theme-toggle.tsx` — a dropdown button using ShadCN DropdownMenu with Sun/Moon/Monitor icons from Lucide. Toggles between light, dark, system.

- [ ] **Step 3: Create Navbar**

Create `components/layout/navbar.tsx` — responsive top navigation bar:
- Left: "MaiKiasu" app name/logo
- Center: nav links to `/`, `/questions`, `/study`, `/statistics` with active route highlighting (use `usePathname()` from `next/navigation`)
- Right: ThemeToggle component
- Mobile (< 768px): hamburger menu using ShadCN `Sheet` component (slide-in from right). Install Sheet if not already: `bunx --bun shadcn@latest add sheet`. Toggle with `Menu` icon from Lucide, close on link click.
- Use Lucide icons: Home, FileQuestion, BookOpen, BarChart3, Menu

- [ ] **Step 4: Create Footer**

Create `components/layout/footer.tsx`:
```typescript
export function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        MaiKiasu — Quiz-based learning with spaced repetition
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Update root layout**

Update `app/layout.tsx` to wrap children in ThemeProvider, include Navbar and Footer, set metadata:
```typescript
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'MaiKiasu',
  description: 'Quiz-based learning with spaced repetition',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <ThemeProvider>
          <Navbar />
          <main className="container mx-auto flex-1 px-4 py-8">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify**

Run: `bun run dev` and open in browser. Verify:
- Dark mode is default
- Navbar renders with links
- Footer is visible at bottom of page
- Theme toggle switches between light/dark/system
- Navigation links work (404 is OK for pages not yet built)
- On mobile viewport: hamburger menu appears and works

- [ ] **Step 7: Commit**

```bash
git add components/layout/ app/layout.tsx
git commit -m "feat: add navbar, footer, theme provider, and root layout with dark mode default"
```

---

## Task 9: Questions Page — Import & List

**Files:**
- Create: `components/questions/question-import.tsx`, `components/questions/question-list.tsx`, `components/questions/export-import-controls.tsx`, `app/questions/page.tsx`

**IMPORTANT:** Use the `frontend-design` skill for polished UI.

- [ ] **Step 1: Create QuestionImport component**

Create `components/questions/question-import.tsx` — a `'use client'` component:
- File input that accepts `.json` files
- Drop zone with drag-and-drop support (visual feedback)
- On file selected: read with FileReader, parse JSON, call `parseQuestionsFromJSON()`
- Show import results: success count, topic count, skipped count, errors
- Save parsed questions to localStorage (append to existing)
- If `set()` returns `false` (QuotaExceededError), show an Alert: "Storage full. Export your data and clear old questions."
- Use ShadCN Card, Button, Alert components
- Props: `onImportComplete: () => void` — callback to refresh the question list

- [ ] **Step 2: Create QuestionList component**

Create `components/questions/question-list.tsx` — a `'use client'` component:
- Props: `refreshKey: number` — increment this to trigger a re-load from localStorage
- Load questions from localStorage when `refreshKey` changes (use `useEffect` with `refreshKey` dependency)
- Filter dropdown by category (topic names)
- Display each question as a card showing: question text (truncated), category badge, question type badge, difficulty
- "Delete" button per question (with confirmation)
- "Clear All" button with confirmation
- Show total count and filtered count
- If no questions: show empty state directing to import

- [ ] **Step 3: Create ExportImportControls component**

Create `components/questions/export-import-controls.tsx` — a `'use client'` component:
- "Export Backup" button → calls `downloadExport()` from `lib/utils/export-import.ts`
- "Import Backup" button → file input, calls `importBackupData()`, shows result summary (questions imported/skipped, metadata merged, sessions merged)
- Props: `onImportComplete: () => void` — callback to refresh data after backup import
- Use ShadCN Button, Alert components

- [ ] **Step 4: Create Questions page**

Create `app/questions/page.tsx` as a `'use client'` wrapper that manages shared state:

```typescript
'use client';

import { useState } from 'react';
import { QuestionImport } from '@/components/questions/question-import';
import { QuestionList } from '@/components/questions/question-list';
import { ExportImportControls } from '@/components/questions/export-import-controls';

export default function QuestionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Questions</h1>
      <QuestionImport onImportComplete={handleRefresh} />
      <ExportImportControls onImportComplete={handleRefresh} />
      <QuestionList refreshKey={refreshKey} />
    </div>
  );
}
```

State sharing approach: The page component owns a `refreshKey` counter. When import completes (questions or backup), it increments the key, which triggers `QuestionList` to re-load from localStorage.

- [ ] **Step 4: Test with questions.json**

Run: `bun run dev`, navigate to `/questions`:
1. Upload `questions.json` from the MaiKiasu directory
2. Verify: "Imported 240 questions from 4 topics (0 skipped)"
3. Verify: all 4 topics appear in filter dropdown
4. Verify: questions display with correct category badges
5. Try re-uploading same file — should show "0 imported, 240 skipped (duplicates)"

- [ ] **Step 5: Commit**

```bash
git add components/questions/ app/questions/
git commit -m "feat: add questions page with JSON import and filterable question list"
```

---

## Task 10: Study Page — Mode Selection & Quiz Session

**Files:**
- Create: `components/study/study-session.tsx`, `components/study/sortable-list.tsx`, `app/study/page.tsx`

**IMPORTANT:** Use the `frontend-design` skill for polished UI. This is the core experience.

- [ ] **Step 0: Add Fisher-Yates shuffle utility**

Add to `lib/utils/utils.ts`:
```typescript
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

- [ ] **Step 1: Create SortableList component**

Create `components/study/sortable-list.tsx` — adapted from reference `learning-app/components/study/sortable-list.tsx`:
- Uses `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `SortableItem` sub-component with drag handle (GripVertical icon)
- Props: `choices: QuestionChoice[]`, `onOrderChange: (newOrder: QuestionChoice[]) => void`, `disabled?: boolean`
- Visual feedback on drag (elevated shadow, border color change)

See reference implementation at `learning-app/components/study/sortable-list.tsx` for the full pattern.

- [ ] **Step 2: Create StudySession component**

Create `components/study/study-session.tsx` — a `'use client'` component. This is the main quiz runner.

**Props:** `questions: Question[]`, `topic: string`, `onComplete: (session: StudySession) => void`

**Internal state:**
- `currentIndex` — which question we're on
- `selectedAnswer` — current selection (choice ID for MC, order array for sorting, text for fill-in)
- `isSubmitted` — whether current question has been answered
- `isCorrect` — result of current answer
- `score` — running correct count
- `startTime` — session start timestamp
- `shuffledQuestions` — Fisher-Yates shuffled copy of questions

**Rendering by question type:**
- `MULTIPLE_CHOICE`: Radio group (ShadCN RadioGroup) with choice labels. Shuffle choices using `shuffleArray()`, reassign labels A/B/C/D.
- `SORTING`: SortableList component. Items shown in their original `options` array order (NOT shuffled — the user's task is to rearrange them into the correct order as defined by `correctOrder`).
- `FILL_IN_BLANK`: Text input field. Show question with `___` placeholder.

**Flow:**
1. Display question text + progress bar ("Question X of Y")
2. User selects answer → enable "Submit" button
3. On submit: evaluate answer, update SM-2 via `updateReviewMetadata()`, show result (green/red) + explanation
4. "Next" button appears → advance to next question
5. After last question: call `onComplete()` with session data

**Answer evaluation:**
- MC: check if selected choice has `isCorrect === true`
- Sorting: compare each item's position to its `correctOrder` — all must match
- Fill-in-blank: `answer.trim().toLowerCase() === choices[0].text.trim().toLowerCase()`

- [ ] **Step 3: Create Study page**

Create `app/study/page.tsx` — a `'use client'` page with two phases:

**Phase 1: Mode Selection**
- Read `?mode=due` query parameter from URL (use `useSearchParams()` from `next/navigation`). If present, pre-select that mode on mount.
- 4 mode cards: "Due for Review", "By Topic", "All Questions", "New Questions"
- Each card shows question count badge (load from localStorage + review service)
- If "By Topic" selected: show topic checkboxes, "Start" button
- Other modes: "Start" button directly

**Phase 2: Quiz Running**
- Render `StudySession` with filtered questions
- On complete: save `StudySession` to localStorage, show summary

**Summary screen:**
- Score: X/Y correct (Z%)
- Time spent
- "Study Again" and "Back to Home" buttons

- [ ] **Step 4: Test the study flow**

Run: `bun run dev`:
1. Import questions first (if not already done)
2. Navigate to `/study`
3. Select "All Questions" mode → Start
4. Answer a few questions, verify correct/incorrect feedback + explanations
5. Complete session, verify summary shows correct stats
6. Go back, select "Due for Review" — should show updated counts based on SM-2

- [ ] **Step 5: Commit**

```bash
git add components/study/ app/study/
git commit -m "feat: add study page with quiz session, 3 question types, SM-2 integration"
```

---

## Task 11: Statistics Page

**Files:**
- Create: `components/statistics/stats-dashboard.tsx`, `app/statistics/page.tsx`

**IMPORTANT:** Use the `frontend-design` skill.

- [ ] **Step 1: Create StatsDashboard component**

Create `components/statistics/stats-dashboard.tsx` — a `'use client'` component:

**Summary Cards (top row, 4 cards):**
- Total Questions (from localStorage)
- Total Studied (questions with `lastReviewed` in review metadata)
- Overall Accuracy (sum of session accuracies / session count, or calculate from all session data)
- Study Streak (count consecutive days with sessions, working backwards from today)

**Topic Breakdown (table or card grid):**
- For each unique category: question count, studied count, accuracy %, mastered count (repetitions >= 3)
- Use ShadCN Card for each topic

**Review State Distribution:**
- Use `getReviewStats()` from review service
- Show New / Learning / Review / Due as colored badges or a simple bar chart
- Use colored segments: Blue (new), Orange (learning), Green (review), Red (due)

**Recent Sessions (bottom section):**
- Table showing last 10 sessions: date, topic, score, accuracy %, duration
- If no sessions: empty state message

Note: Export/Import controls live on the Questions page (`components/questions/export-import-controls.tsx`), not here.

- [ ] **Step 2: Create Statistics page**

Create `app/statistics/page.tsx`:
```typescript
import { StatsDashboard } from '@/components/statistics/stats-dashboard';

export default function StatisticsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Statistics</h1>
      <StatsDashboard />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `bun run dev`, navigate to `/statistics`:
- After having completed some study sessions, verify stats show correctly
- Test export: download backup file, inspect JSON
- Test import: upload the backup file on a fresh browser (or after clearing localStorage)

- [ ] **Step 4: Commit**

```bash
git add components/statistics/ app/statistics/
git commit -m "feat: add statistics page with progress tracking, topic breakdown, export/import"
```

---

## Task 12: Home Dashboard

**Files:**
- Modify: `app/page.tsx`

**IMPORTANT:** Use the `frontend-design` skill.

- [ ] **Step 1: Create Home Dashboard**

Rewrite `app/page.tsx` as a `'use client'` component:

**If no questions imported:**
- Welcome message + onboarding card directing to `/questions`
- "Import Questions" CTA button

**If questions exist:**
- Welcome header: "MaiKiasu"
- Quick stats row (3 cards): Due questions count (red if > 0), Total questions, Overall accuracy %
- "Start Studying" CTA button:
  - If due questions > 0: button says "Review Due Questions (N)" and links to `/study?mode=due`
  - Otherwise: "Start Studying" and links to `/study`
- Recent activity: last 3 study sessions as compact cards (date, topic, score)

- [ ] **Step 2: Verify**

Run: `bun run dev`:
1. Fresh state (no localStorage): verify onboarding screen
2. After importing questions: verify dashboard shows question count
3. After study sessions: verify recent activity and stats

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add home dashboard with quick stats, CTA, and recent activity"
```

---

## Task 13: Final Polish & Verification

**Files:**
- Various touch-ups across all files

- [ ] **Step 1: Run full type check**

Run: `bun run type-check`
Fix any TypeScript errors.

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Fix any lint errors.

- [ ] **Step 3: Run production build**

Run: `bun run build`
Fix any build errors.

- [ ] **Step 4: Full end-to-end manual test**

Run: `bun run dev` and verify complete flow:
1. Home page shows onboarding (fresh state)
2. Navigate to `/questions` → upload `questions.json` → 240 questions imported
3. Navigate back to home → shows 240 questions, all due
4. Navigate to `/study` → select "By Topic" → pick "Deployment" → Start
5. Answer 5 questions, verify MC question flow works (shuffle, submit, feedback, next)
6. Complete session → verify summary
7. Navigate to `/statistics` → verify stats reflect the session
8. Navigate to `/study` → "Due for Review" count should have decreased
9. Test theme toggle (dark → light → system → dark)
10. Test export → download backup
11. Clear localStorage (dev tools) → import backup → verify data restored

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish and fix issues from end-to-end testing"
```

- [ ] **Step 6: Final commit with clean state**

Verify `git status` is clean. The app is ready.
