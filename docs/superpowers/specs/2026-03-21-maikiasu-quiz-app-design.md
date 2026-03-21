# MaiKiasu Quiz Learning App — Design Specification

**Date:** 2026-03-21
**Approach:** Build Fresh, Cherry-Pick from learning-app reference

## Overview

MaiKiasu is a client-side quiz-based learning application built with Next.js 15 and React 19. Users import questions via JSON file upload, study through interactive quizzes with three question types, and track progress via SM-2 spaced repetition and a statistics dashboard. Dark mode is the default theme.

**Reference project:** `C:\Users\User\Desktop\DL_Helpers\autodownload\learning-app` — cherry-pick SM-2 algorithm, localStorage adapter pattern, and review service logic. All other code is written fresh.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 (latest stable) | Framework, App Router |
| React | 19 (latest stable) | UI library |
| TypeScript | Strict mode | Type safety |
| Bun | Latest | Package manager & runtime |
| Tailwind CSS | v4 (latest stable) | Styling (CSS-first config) |
| ShadCN/ui | Latest | Component library (Radix UI based) |
| Lucide React | Latest | Icons |
| next-themes | Latest | Dark/light/system mode |
| @dnd-kit | Latest | Drag-and-drop for sorting questions |

## Architecture

### Project Structure

```
MaiKiasu/
├── app/
│   ├── layout.tsx              # Root layout: theme provider, navbar, footer
│   ├── page.tsx                # Home dashboard
│   ├── globals.css             # Tailwind v4 theme config
│   ├── questions/
│   │   └── page.tsx            # Question import & management
│   ├── study/
│   │   └── page.tsx            # Study session selector & quiz runner
│   └── statistics/
│       └── page.tsx            # Progress tracking dashboard
├── components/
│   ├── layout/
│   │   ├── navbar.tsx          # Top navigation bar
│   │   ├── footer.tsx          # Page footer
│   │   ├── theme-provider.tsx  # next-themes wrapper
│   │   └── theme-toggle.tsx    # Dark/light/system toggle
│   ├── questions/
│   │   ├── question-import.tsx # JSON file upload & parsing UI
│   │   ├── question-list.tsx   # Display, filter, delete questions
│   │   └── export-import-controls.tsx # Full data backup/restore
│   ├── study/
│   │   ├── study-session.tsx   # Main quiz component
│   │   └── sortable-list.tsx   # Drag-and-drop for sorting questions
│   ├── statistics/
│   │   └── stats-dashboard.tsx # Progress cards, topic breakdowns
│   └── ui/                     # ShadCN components (CLI-installed)
├── lib/
│   ├── algorithms/
│   │   └── sm2.ts              # SM-2 spaced repetition (cherry-picked)
│   ├── storage/
│   │   └── local-storage.ts    # Type-safe localStorage adapter (cherry-picked pattern)
│   ├── services/
│   │   └── review-service.ts   # Review scheduling & statistics (cherry-picked logic)
│   ├── parsers/
│   │   └── json-parser.ts      # Parse MaiKiasu JSON format to internal model
│   └── utils/
│       ├── export-import.ts    # Full data export/import
│       └── utils.ts            # cn() helper
├── types/
│   └── question.ts             # All TypeScript interfaces & enums
└── docs/                       # Conventions, guides
```

### Key Principle: Client-Side Only

No backend, no API routes. All data lives in browser localStorage. The app is a static Next.js site that runs entirely in the browser.

## Data Model

### Input Format (questions.json)

The app natively supports this JSON structure for **multiple choice** questions:

```json
{
  "topics": {
    "topic_XX": {
      "name": "Topic Name",
      "icon": "[X]",
      "questions": [
        {
          "id": 1,
          "question": "Question text...",
          "options": [
            "Option A -- optional explanation",
            "Option B -- optional explanation"
          ],
          "correct": 1,
          "rationale": "Explanation of the correct answer..."
        }
      ]
    }
  }
}
```

For **sorting** questions, the JSON uses `"type": "sorting"` and `"correctOrder"`:

```json
{
  "id": 2,
  "type": "sorting",
  "question": "Arrange these in order...",
  "options": ["Step A", "Step B", "Step C"],
  "correctOrder": [2, 0, 1],
  "rationale": "Explanation..."
}
```

For **fill-in-the-blank** questions, the JSON uses `"type": "fill_in_blank"` and `"answer"`:

```json
{
  "id": 3,
  "type": "fill_in_blank",
  "question": "The process of fixing bugs is called ___ maintenance.",
  "answer": "corrective",
  "rationale": "Explanation..."
}
```

- `correct` is a 0-based index into the `options` array (multiple choice only)
- `correctOrder` is an array mapping display position to correct position (sorting only)
- `answer` is the expected text answer (fill-in-the-blank only)
- `rationale` maps to `explanation` internally
- Topic `name` becomes the question's `category`
- The `" -- "` separator in options is preserved (useful context for learners)
- If `type` is omitted, defaults to `multiple_choice`

### Internal Data Model

```typescript
// types/question.ts

enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SORTING = 'sorting',
  FILL_IN_BLANK = 'fill_in_blank',
}

enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

interface QuestionChoice {
  id: string;
  label: string;           // A, B, C, D...
  text: string;
  isCorrect: boolean;
  correctOrder?: number;   // For sorting questions only
}

interface Question {
  id: string;               // Generated UUID
  text: string;
  questionType: QuestionType;
  choices: QuestionChoice[];
  explanation: string;
  category: string;         // From topic name
  difficulty: Difficulty;
  createdAt: string;        // ISO date
  updatedAt: string;        // ISO date
}

// Date fields stored as ISO strings in localStorage for serialization simplicity.
// Consumers parse to Date objects when needed for comparison/calculation.
interface ReviewMetadata {
  questionId: string;
  easinessFactor: number;   // SM-2: 1.3-2.5 range
  interval: number;         // Days until next review
  repetitions: number;      // Consecutive correct answers
  nextReviewDate: string;   // ISO date string (parsed to Date for comparisons)
  lastReviewed?: string;    // ISO date string (parsed to Date for comparisons)
}

interface StudySession {
  id: string;
  date: string;             // ISO date
  topic: string | 'mixed';  // Which topic(s) were studied
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;         // Percentage
  duration: number;         // Seconds
}
```

### localStorage Keys

| Key | Contents |
|---|---|
| `maikiasu:questions` | `Question[]` — all imported questions |
| `maikiasu:review-metadata` | `Record<string, ReviewMetadata>` — SM-2 state per question ID |
| `maikiasu:sessions` | `StudySession[]` — historical study session records |
| `maikiasu:settings` | `{ theme: 'dark' | 'light' | 'system' }` |

## JSON Import

### Parser Behavior (`lib/parsers/json-parser.ts`)

1. Accept uploaded `.json` file
2. Validate structure: must have `topics` object at root
3. For each topic → for each question:
   - Generate UUID for `id` using `crypto.randomUUID()`
   - Map `question` → `text`
   - Map `options` array → `choices` with labels (A, B, C, D...)
   - Map `correct` index → `isCorrect: true` on matching choice
   - Map `rationale` → `explanation`
   - Map topic `name` → `category`
   - Detect `questionType` from `type` field: `"sorting"` → SORTING, `"fill_in_blank"` → FILL_IN_BLANK, default → MULTIPLE_CHOICE
   - For sorting: map `correctOrder` array to `choices[i].correctOrder`
   - For fill-in-blank: create single choice from `answer` field with `isCorrect: true`
   - Set `difficulty: 'medium'` (default)
4. Duplicate detection: compare question `text` against existing questions (exact string match), skip if already imported
5. Return parsed questions with success/error counts
6. Store in localStorage

### Error Handling

- Missing required fields → skip question, report error with topic + question ID
- Invalid `correct` index (out of bounds) → skip question
- Empty options array → skip question
- Show import summary: "Imported X questions from Y topics (Z skipped)"

## Study Session

### Study Modes

1. **Due for Review** — Questions where `nextReviewDate <= today` (SM-2 scheduled)
2. **By Topic** — Select one or more categories, study their questions
3. **All Questions** — Random mix of all imported questions
4. **New Questions** — Questions with no ReviewMetadata (never studied)

### Quiz Flow

1. **Mode Selection**: Cards showing each mode with question count badges
2. **Topic Selection** (if "By Topic"): Checkboxes for each category, "Select All" option
3. **Quiz Running**:
   - Questions shuffled (Fisher-Yates algorithm)
   - Progress bar at top: "Question 3 of 20"
   - **Multiple Choice**: Radio buttons for options, "Submit" button
   - **Sorting**: Drag-and-drop list using @dnd-kit, "Submit" button
   - **Fill-in-the-Blank**: Text input field, "Submit" button
   - After submit: show correct/incorrect + explanation/rationale
   - "Next" button to advance
4. **Session Summary**: Score card with accuracy %, correct/total, time spent

### Answer Evaluation

- **Multiple Choice**: Compare selected option index to `isCorrect` flag
- **Sorting**: Compare user order to `correctOrder` values — all must match
- **Fill-in-the-Blank**: Compare user input against the `answer` field from JSON (stored as `choices[0].text` with `isCorrect: true`). Case-insensitive, trim whitespace. No partial matching — exact word match only.

### Choice Randomization

- Multiple choice: choices shuffled, labels reassigned (A, B, C, D...)
- Sorting: NOT shuffled (order is the puzzle)
- Fill-in-the-blank: N/A (single input)

## SM-2 Spaced Repetition

Cherry-picked from `learning-app/lib/algorithms/sm2.ts`.

### Algorithm

Follows the reference SM-2 implementation from `learning-app/lib/algorithms/sm2.ts`.

After each answer:
- **Quality rating**: correct → 4 (good recall), incorrect → 0 (complete failure)
- **If quality >= 3 (correct)**:
  - If repetitions == 0 (first correct) → interval = 1 day
  - If repetitions == 1 (second correct) → interval = 6 days
  - If repetitions >= 2 → interval = round(interval × easinessFactor)
  - Then: repetitions += 1
- **If quality < 3 (incorrect)**:
  - repetitions = 0
  - interval = 1 day
- **Always (regardless of correctness)**:
  - Update easinessFactor: EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))
  - EF clamped to minimum 1.3

### Review States

"Due" is a modifier that applies on top of other states. New questions are always considered due.

| State | Condition | Visual |
|---|---|---|
| New | No `lastReviewed` in ReviewMetadata | Blue badge |
| Learning | `repetitions < 2` and has been reviewed | Orange badge |
| Review | `repetitions >= 2` | Green badge |
| Due | `nextReviewDate <= today` OR no `lastReviewed` (New) | Red badge |

### Initial Values

- easinessFactor: 2.5
- interval: 0
- repetitions: 0

## Statistics Dashboard

### Metrics Displayed

**Summary Cards (top row):**
- Total Questions imported
- Total Studied (unique questions answered at least once)
- Overall Accuracy %
- Current Study Streak (consecutive days with a session)

**Topic Breakdown (table or cards):**
- Per-topic: question count, studied count, accuracy %, mastered count (repetitions >= 3)

**Review State Distribution:**
- Visual breakdown: New / Learning / Review / Due counts

**Recent Sessions (list):**
- Date, topic, score (X/Y), accuracy %, duration

### Data Export/Import

- **Export**: Download a single JSON file containing questions + review metadata + sessions
- **Import**: Upload backup JSON. Conflict resolution: questions with matching text are skipped (keep existing). Review metadata and sessions are merged (newer `lastReviewed` wins for metadata conflicts). User is shown a summary of what was imported vs skipped.
- Prevents data loss when clearing browser storage
- **localStorage limits**: ~5-10MB per domain. On `QuotaExceededError`, show a user-friendly error suggesting they export and clear old data.

## Pages & Navigation

### Routes

| Route | Page | Server/Client |
|---|---|---|
| `/` | Home Dashboard | Server page, client components |
| `/questions` | Question Management | Server page, client components |
| `/study` | Study Session | Server page, client components |
| `/statistics` | Statistics Dashboard | Server page, client components |

### Home Dashboard Content

The home page (`/`) displays:
- **Welcome header** with app name
- **Quick stats row**: Due questions count, total questions, overall accuracy
- **"Start Studying" CTA button** → navigates to `/study` with "Due for Review" pre-selected if questions are due
- **Recent activity**: last 3 study sessions (date, score, topic)
- If no questions imported yet: onboarding prompt directing to `/questions` to import

### Navigation Bar

- Left: Logo + "MaiKiasu" text
- Center: Links to Home, Questions, Study, Statistics (active route highlighted)
- Right: Theme toggle (dark/light/system)
- Responsive: hamburger menu on mobile (< 768px)

### Theme

- **Default: Dark mode**
- Toggle between dark, light, system
- ShadCN components respect theme via CSS variables
- Tailwind v4 CSS-first theme configuration in `globals.css`

## UI Design Direction

- Dark mode as default, polished and modern
- Will use frontend-design skill during implementation for distinctive visual quality
- ShadCN components as base, customized for visual appeal
- Clean spacing, readable typography, consistent color palette

## Cherry-Picked Modules

From `learning-app`, adapt (not copy verbatim):

1. **SM-2 Algorithm** (`lib/algorithms/sm2.ts`) — core calculation logic
2. **LocalStorage Adapter** (`lib/storage/local-storage.ts`) — type-safe get/set pattern
3. **Review Service** (`lib/services/review-service.ts`) — review scheduling, due detection, statistics aggregation
4. **Sortable List** (`components/study/sortable-list.tsx`) — @dnd-kit drag-and-drop pattern

All cherry-picked code will be updated to use latest dependency APIs and adapted to MaiKiasu's data model.

## Out of Scope

- PDF/OCR import (learning-app has it, MaiKiasu does not need it)
- Markdown question parser (JSON only)
- Question editing UI (import-only for now)
- Backend/API/database
- User authentication
- Multi-user support
