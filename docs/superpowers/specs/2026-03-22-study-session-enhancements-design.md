# Study Session Enhancements — Design Spec

## Overview

Enhance the MaiKiasu study experience with question navigation, session persistence, topic-filtered due review, retry-missed flow, and UX improvements (keyboard shortcuts, timer, confidence indicator, streak counter).

## Approach

**Component Decomposition** — Break the current monolithic `study-session.tsx` (~250 lines) into focused components, then layer new features on top. This keeps each component small and testable.

---

## 1. Component Structure

### Current

```
components/study/
├── study-session.tsx    ← Monolithic: renders questions, handles answers, shows summary
└── sortable-list.tsx    ← Drag-and-drop for sorting questions
```

### New

```
components/study/
├── study-session.tsx          ← Orchestrator: state, persistence, SM-2, keyboard shortcuts
├── question-renderer.tsx      ← Renders MC/Sorting/Fill-in-Blank by question type
├── answer-feedback.tsx        ← Correct/incorrect highlight + explanation
├── session-navigation.tsx     ← Prev/Next buttons + question counter + grid toggle
├── question-grid.tsx          ← Modal with numbered color-coded chips for jumping
├── session-summary.tsx        ← End screen: score, breakdown, retry button
├── session-resume-banner.tsx  ← "Resume unfinished session" prompt
└── sortable-list.tsx          ← Unchanged
```

### Component Responsibilities

**`study-session.tsx` (Orchestrator)**
- Owns all state: `currentIndex`, `answers` map, `score`, `elapsedSeconds`, `streak` (streak is component-only `useState`, not persisted in `ActiveSession` — resets to 0 on resume)
- Auto-saves `ActiveSession` to localStorage after every answer
- Coordinates SM-2 updates via `updateReviewMetadata()`
- Handles keyboard shortcuts (`←`, `→`, `G`, `1-4`, `Enter`)
- Passes data down to child components; no question rendering logic

**`question-renderer.tsx`**
- Pure display component
- Takes: `question`, `answerState`, `isSubmitted`, `isViewOnly`
- Renders the appropriate input type based on `question.questionType`
- Emits `onAnswer(value)` when user selects/types an answer
- In view-only mode: shows selected answer and correct answer, all inputs disabled

**`answer-feedback.tsx`**
- Takes: `isCorrect`, `correctAnswer`, `explanation`, `isSubmitted`
- Shows green/red highlighting on choices and explanation text
- Only renders when `isSubmitted === true`

**`session-navigation.tsx`**
- Renders: `← Prev | Q 5 of 20 | ⊞ Grid | Next →`
- Prev disabled on Q1
- Next disabled when current question is the frontier (first unanswered) and not yet submitted
- After submission, Next advances to next question
- When reviewing past questions, Next moves forward freely through answered questions
- Emits: `onPrev()`, `onNext()`, `onOpenGrid()`

**`question-grid.tsx`**
- Modal overlay with numbered chips in a responsive grid (5-10 per row)
- Color coding: green=correct, red=incorrect, gray=unanswered, blue outline=current
- Clicking any chip jumps to that question
- Answered questions open in view-only; unanswered are interactive
- Clicking beyond the frontier jumps to the frontier instead
- Legend at bottom: `🟢 Correct  🔴 Incorrect  ⬜ Unanswered  🔵 Current`

**`session-summary.tsx`**
- Shown when all questions are answered
- Displays: score, accuracy percentage, duration, topics covered
- Per-question breakdown: scrollable list with ✓/✗, topic, truncated question text
- Clicking a row expands to show question, user's answer, correct answer
- Weakest topic line (shown only if 2+ topics in session)
- Buttons: "Retry Missed (N)" and "Back to Study"

**`session-resume-banner.tsx`**
- Shown on Study page and Home page when `ActiveSession` exists in localStorage
- Displays: mode, progress (e.g., "15/40 questions"), accuracy so far
- Two buttons: "Resume" and "Start Fresh"
- "Resume" restores session, lands on next unanswered question
- "Start Fresh" deletes saved session, returns to mode selection

---

## 2. Session State & Persistence

### ActiveSession Type

```typescript
interface ActiveSession {
  id: string;                    // UUID
  mode: 'due' | 'topic' | 'all' | 'new';
  selectedTopics?: string[];     // for topic and due-by-topic modes
  questionIds: string[];         // ordered list of question IDs
  answers: Record<string, {      // keyed by question ID
    selectedAnswer: number | string | string[];
    // For MC: number (selected choice index)
    // For fill-in-blank: string (typed text)
    // For sorting: string[] (array of choice IDs in user's order)
    isCorrect: boolean;
    submittedAt: string;         // ISO timestamp
    confidence: 'sure' | 'guessing';
  }>;
  currentIndex: number;          // user's last position
  startedAt: string;             // ISO timestamp
  elapsedSeconds: number;        // accumulated timer (paused on tab hide)
  isRetry: boolean;
  parentSessionId?: string;      // links retry to original
}
```

### Storage Key

Add to `STORAGE_KEYS`:
```typescript
ACTIVE_SESSION: 'maikiasu:active-session'
```

### Persistence Rules

| Event | Action |
|-------|--------|
| Answer submitted | Save full `ActiveSession` to localStorage. Wrap in try-catch; on `QuotaExceededError`, show a non-blocking toast: "Session auto-save failed — storage full. Your session will continue but cannot be resumed if you leave." Suppress further save attempts for the current session. |
| Navigate to `/study` | Check for `ActiveSession`, show resume banner if found |
| Navigate to Home `/` | Check for `ActiveSession`, show resume banner if found |
| Click "Resume" | Restore session. Validate all `questionIds` still exist in the question bank — filter out any missing IDs and adjust `currentIndex` accordingly. If no valid questions remain, delete `ActiveSession` and show mode selection. Jump to next unanswered question. |
| Click "Start Fresh" | Delete `ActiveSession`, show mode selection |
| Session completes | Record `StudySession`, delete `ActiveSession` |
| Click "Back to Study" on summary | Delete `ActiveSession`, return to mode selection |

### Navigation Behavior

- **Previously answered question** — View-only: answer highlighted, explanation shown, no re-submission, submit buttons hidden
- **Unanswered question** — Fully interactive: select answer, submit with confidence
- **Frontier** — The first unanswered question. Next button stops here until the question is submitted. Grid clicks beyond frontier redirect to frontier.

---

## 3. Study Page Flow Changes

### Current Flow

```
Study Page → Click mode card → [Topic selection if "By Topic"] → Start quiz → Inline summary
```

### New Flow

```
Study Page → [Resume banner if active session exists]
           → Click mode card
           → [Due for Review: Topic selection with due counts]
           → [By Topic: Topic selection with all counts (unchanged)]
           → [All / New: Start immediately, no topic selection]
           → Quiz (with navigation, persistence, timer)
           → Summary screen (with retry option)
```

### Due for Review — Topic Selection

When "Due for Review" is clicked, show a topic selection screen:

- Only topics that have due questions are checkable; topics with 0 due are shown but disabled/grayed
- All topics with due questions are pre-checked by default
- Each topic shows its due count: `Configuration Management (38 due)`
- "Start Review" button shows total selected due count, disabled if nothing selected
- This reuses the existing topic selection pattern from "By Topic" mode but filtered to due questions
- If no topics have due questions (all counts are 0), this path is unreachable because the "Due for Review" mode card shows count 0 and is not clickable when there are no due questions

### Home Page Changes

- If an `ActiveSession` exists: show `session-resume-banner.tsx` above the existing dashboard
- The existing "Review Due Questions (N)" CTA remains unchanged below

---

## 4. Retry Flow

1. Session summary shows "Retry Missed (N)" button only if N > 0. If all answers are correct (N=0), the "Retry Missed" button is hidden; only "Back to Study" is shown.
2. Clicking creates a new `ActiveSession` with:
   - `isRetry: true`
   - `parentSessionId` set to original session ID
   - `questionIds` = only the incorrectly answered questions, reshuffled
3. Retry session runs as a normal session (navigation, persistence, timer all work)
4. SM-2 is updated on every answer submission regardless of retry status:
   - Correct answer: `updateReviewMetadata(questionId, true, confidence)` with quality=4 (sure) or quality=3 (guessing)
   - Incorrect answer: `updateReviewMetadata(questionId, false, confidence)` with quality=0
5. Retry session is recorded as a separate `StudySession` in history with `isRetry: true` and `parentSessionId` set
6. At retry summary, "Retry Missed" appears again if there are still incorrect answers
7. User can keep retrying or click "Back to Study" to exit

---

## 5. SM-2 Confidence Integration

### Quality Ratings

Current: `correct → 4`, `incorrect → 0`

New:
| Answer | Confidence | Quality |
|--------|-----------|---------|
| Correct | Sure | 4 |
| Correct | Guessing | 3 |
| Incorrect | Sure | 0 |
| Incorrect | Guessing | 0 |

### Impact

Quality 3 vs 4 affects the ease factor calculation. A "guessing" correct answer will result in a slightly lower ease factor and shorter next interval — the system reviews it sooner because the user wasn't confident.

### `getQualityRating` Update

```typescript
export function getQualityRating(isCorrect: boolean, confidence: 'sure' | 'guessing' = 'sure'): number {
  if (!isCorrect) return 0;
  return confidence === 'guessing' ? 3 : 4;
}
```

### `updateReviewMetadata` Signature Update

```typescript
// Before
export function updateReviewMetadata(questionId: string, isCorrect: boolean): ReviewMetadata

// After
export function updateReviewMetadata(questionId: string, isCorrect: boolean, confidence?: 'sure' | 'guessing'): ReviewMetadata
```

Internally calls: `const quality = getQualityRating(isCorrect, confidence);`

### UI

Replace the single "Submit Answer" button with two side-by-side buttons:
- **"Submit"** — default, maps to `confidence: 'sure'`
- **"Guessing"** — secondary/outline style, maps to `confidence: 'guessing'`

Both are disabled until an answer is selected. Both trigger the same submit flow, differing only in the quality rating passed to SM-2.

---

## 6. Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `←` | Previous question | Always (disabled on Q1) |
| `→` | Next question | Always (disabled at frontier before submit) |
| `G` | Toggle question grid | Always |
| `1`-`4` | Select MC answer option | MC questions, before submission. Only reaches the first 4 options; questions with 5+ choices require mouse/touch for remaining options. |
| `Enter` | Submit (sure) / Next question | Before submit: submits with sure confidence. After submit: advances to next. On the last question after submission, Enter navigates to the summary screen. |
| `Escape` | Close grid modal | When grid is open |

- Shortcuts are registered via `useEffect` with `keydown` listener on `window`
- When the grid modal is open, only `G` (to close the grid) and `Escape` (to close the grid) are active. All other shortcuts are suppressed.
- A `⌨` icon in the navigation bar; hovering shows a tooltip listing all shortcuts

---

## 7. Session Timer

- Displays in the top-right of the study session, near the score counter
- Format: `mm:ss` (e.g., `12:34`). If `elapsedSeconds >= 3600`, display as `h:mm:ss` (e.g., `1:05:23`)
- Starts from `00:00` on new session, or from `elapsedSeconds` on resume
- Pauses when browser tab is hidden (`document.visibilitychange` event)
- Stored as `elapsedSeconds` in `ActiveSession` for persistence
- Uses `setInterval(1000)` with cleanup on unmount
- Final duration shown on summary screen and saved to `StudySession.duration`

---

## 8. Streak Counter

- Shows current consecutive correct answers: `🔥 5`
- Positioned near the score counter in the session header
- Resets to 0 on any incorrect answer
- Not persisted — held as component state only (`useState`). On resume, streak starts at 0
- Purely visual/motivational — no effect on SM-2 or scoring

---

## 9. Data Model Changes

### New Type: `ActiveSession`

Added to `types/question.ts`:

```typescript
export interface ActiveSessionAnswer {
  selectedAnswer: number | string | string[];
  // For MC: number (selected choice index)
  // For fill-in-blank: string (typed text)
  // For sorting: string[] (array of choice IDs in user's order)
  isCorrect: boolean;
  submittedAt: string;
  confidence: 'sure' | 'guessing';
}

export interface ActiveSession {
  id: string;
  mode: 'due' | 'topic' | 'all' | 'new';
  selectedTopics?: string[];
  questionIds: string[];
  answers: Record<string, ActiveSessionAnswer>;
  currentIndex: number;
  startedAt: string;
  elapsedSeconds: number;
  isRetry: boolean;
  parentSessionId?: string;
}
```

### Updated Type: `StudySession`

Add retry tracking fields:

```typescript
export interface StudySession {
  id: string;
  date: string;
  topic: string | 'mixed';
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  duration: number;
  mode: 'due' | 'topic' | 'all' | 'new';  // NEW
  isRetry?: boolean;                        // NEW
  parentSessionId?: string;                 // NEW
}
```

When multiple topics are involved, `topic` is set to `'mixed'` (preserving existing behavior and home page compatibility).

### Storage Key Addition

```typescript
export const STORAGE_KEYS = {
  QUESTIONS: 'maikiasu:questions',
  REVIEW_METADATA: 'maikiasu:review-metadata',
  SESSIONS: 'maikiasu:sessions',
  SETTINGS: 'maikiasu:settings',
  ACTIVE_SESSION: 'maikiasu:active-session',  // NEW
} as const;
```

### `getQualityRating` Signature Change

```typescript
// Before
export function getQualityRating(isCorrect: boolean): number

// After
export function getQualityRating(isCorrect: boolean, confidence?: 'sure' | 'guessing'): number
```

---

## 10. Files Modified

| File | Change |
|------|--------|
| `types/question.ts` | Add `ActiveSession`, `ActiveSessionAnswer` types; add `mode`, `isRetry?`, `parentSessionId?` fields to `StudySession` |
| `lib/storage/local-storage.ts` | Add `ACTIVE_SESSION` storage key |
| `lib/algorithms/sm2.ts` | Update `getQualityRating` for confidence parameter |
| `lib/services/review-service.ts` | Update `updateReviewMetadata` to accept confidence |
| `components/study/study-session.tsx` | Refactor to orchestrator; add persistence, timer, keyboard, streak |
| `components/study/question-renderer.tsx` | **New** — extracted question rendering |
| `components/study/answer-feedback.tsx` | **New** — extracted answer feedback |
| `components/study/session-navigation.tsx` | **New** — prev/next + counter + grid toggle |
| `components/study/question-grid.tsx` | **New** — modal question navigator |
| `components/study/session-summary.tsx` | **New** — end screen with retry |
| `components/study/session-resume-banner.tsx` | **New** — resume/start-fresh prompt |
| `app/study/page.tsx` | Add resume check, due-by-topic flow, remove inline summary |
| `app/page.tsx` | Add resume banner integration; update topic display to handle `'mixed'` value consistently |
