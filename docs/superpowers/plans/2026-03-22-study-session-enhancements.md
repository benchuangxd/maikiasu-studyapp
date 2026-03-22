# Study Session Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add question navigation, session persistence, topic-filtered due review, retry-missed flow, keyboard shortcuts, timer, confidence indicator, and streak counter to the study experience.

**Architecture:** Component decomposition approach — break monolithic `study-session.tsx` into focused components (question-renderer, answer-feedback, session-navigation, question-grid, session-summary, session-resume-banner), then layer new features. All state persisted to localStorage via existing adapter pattern.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, ShadCN/ui (Radix), @dnd-kit, next-themes, localStorage

**Spec:** `docs/superpowers/specs/2026-03-22-study-session-enhancements-design.md`

---

## File Structure

### Modified Files
| File | Responsibility |
|------|---------------|
| `types/question.ts` | Add `ActiveSession`, `ActiveSessionAnswer`; extend `StudySession` with `mode`, `isRetry?`, `parentSessionId?` |
| `lib/storage/local-storage.ts` | Add `ACTIVE_SESSION` storage key |
| `lib/algorithms/sm2.ts` | Add `confidence` param to `getQualityRating` |
| `lib/services/review-service.ts` | Add `confidence` param to `updateReviewMetadata`; add `getDueQuestionsByTopic` |
| `components/study/study-session.tsx` | Full rewrite as orchestrator — state management, persistence, keyboard, timer |
| `app/study/page.tsx` | Resume check, due-by-topic flow, remove inline summary |
| `app/page.tsx` | Add resume banner |

### New Files
| File | Responsibility |
|------|---------------|
| `components/study/question-renderer.tsx` | Renders MC/Sorting/Fill-in-Blank question content (includes inline answer feedback) |
| `components/study/session-navigation.tsx` | Prev/Next buttons, question counter, grid toggle |
| `components/study/question-grid.tsx` | Modal with numbered color-coded chips |
| `components/study/session-summary.tsx` | End screen with score breakdown + retry |
| `components/study/session-resume-banner.tsx` | Resume/start-fresh prompt |
| `lib/utils/format.ts` | Shared formatting helpers (duration, date) |
| `components/ui/tooltip.tsx` | ShadCN tooltip component (needed for keyboard shortcut hint) |

---

### Task 1: Data Model & Storage Updates

**Files:**
- Modify: `types/question.ts`
- Modify: `lib/storage/local-storage.ts`

- [ ] **Step 1: Add ActiveSession types to `types/question.ts`**

Add after the existing `StudySession` interface:

```typescript
export interface ActiveSessionAnswer {
  selectedAnswer: number | string | string[];
  // MC: number (choice index), fill-in-blank: string, sorting: string[] (choice IDs in order)
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

- [ ] **Step 2: Extend `StudySession` with retry tracking fields**

Update the existing `StudySession` interface:

```typescript
export interface StudySession {
  id: string;
  date: string;
  topic: string | 'mixed';
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  duration: number;
  mode?: 'due' | 'topic' | 'all' | 'new';
  isRetry?: boolean;
  parentSessionId?: string;
}
```

Note: `mode`, `isRetry`, `parentSessionId` are optional to maintain backward compatibility with existing session data.

- [ ] **Step 3: Add `ACTIVE_SESSION` storage key**

In `lib/storage/local-storage.ts`, add to `STORAGE_KEYS`:

```typescript
export const STORAGE_KEYS = {
  QUESTIONS: 'maikiasu:questions',
  REVIEW_METADATA: 'maikiasu:review-metadata',
  SESSIONS: 'maikiasu:sessions',
  SETTINGS: 'maikiasu:settings',
  ACTIVE_SESSION: 'maikiasu:active-session',
} as const;
```

- [ ] **Step 4: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS (no type errors — new types are additive)

- [ ] **Step 5: Commit**

```bash
git add types/question.ts lib/storage/local-storage.ts
git commit -m "feat: add ActiveSession types and storage key for session persistence"
```

---

### Task 2: SM-2 Confidence Integration

**Files:**
- Modify: `lib/algorithms/sm2.ts`
- Modify: `lib/services/review-service.ts`

- [ ] **Step 1: Update `getQualityRating` in `sm2.ts`**

Replace the existing function:

```typescript
export function getQualityRating(isCorrect: boolean, confidence: 'sure' | 'guessing' = 'sure'): number {
  if (!isCorrect) return 0;
  return confidence === 'guessing' ? 3 : 4;
}
```

- [ ] **Step 2: Update `updateReviewMetadata` in `review-service.ts`**

Update the function signature and internal call:

```typescript
export function updateReviewMetadata(
  questionId: string,
  isCorrect: boolean,
  confidence: 'sure' | 'guessing' = 'sure',
): ReviewMetadata {
  const currentMetadata = getReviewMetadata(questionId);
  const quality = getQualityRating(isCorrect, confidence);

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
```

- [ ] **Step 3: Add `getDueQuestionsByTopic` to `review-service.ts`**

Add this new function after `getDueQuestions`:

```typescript
export function getDueQuestionsByTopic(questions: Question[]): Record<string, Question[]> {
  const dueQuestions = getDueQuestions(questions);
  const byTopic: Record<string, Question[]> = {};
  for (const q of dueQuestions) {
    if (!byTopic[q.category]) {
      byTopic[q.category] = [];
    }
    byTopic[q.category].push(q);
  }
  return byTopic;
}
```

- [ ] **Step 4: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/algorithms/sm2.ts lib/services/review-service.ts
git commit -m "feat: add confidence parameter to SM-2 quality rating and due-by-topic helper"
```

---

### Task 3: Shared Utilities — Format Helpers & Tooltip Component

**Files:**
- Create: `lib/utils/format.ts`
- Create: `components/ui/tooltip.tsx`

- [ ] **Step 1: Create `lib/utils/format.ts`**

Extract and centralize formatting helpers (currently duplicated between `app/page.tsx` and `app/study/page.tsx`):

```typescript
export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDurationHuman(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
```

- [ ] **Step 2: Install and add ShadCN Tooltip component**

Run: `bunx --bun shadcn@latest add tooltip`

This will create `components/ui/tooltip.tsx` with the Radix-based tooltip.

- [ ] **Step 3: Verify — run type-check and build**

Run: `bun run type-check && bun run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/utils/format.ts components/ui/tooltip.tsx
git commit -m "feat: add shared format utilities and tooltip UI component"
```

---

### Task 4: Question Renderer Component

**Files:**
- Create: `components/study/question-renderer.tsx`

This extracts the MC/Sorting/Fill-in-Blank rendering from the monolithic `study-session.tsx`.

- [ ] **Step 1: Create `components/study/question-renderer.tsx`**

```typescript
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SortableList } from '@/components/study/sortable-list';
import type { Question, QuestionChoice } from '@/types/question';
import { QuestionType } from '@/types/question';
import { cn, shuffleArray } from '@/lib/utils';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  selectedAnswer: string | null;
  sortedChoices: QuestionChoice[];
  isSubmitted: boolean;
  isCorrect: boolean;
  isViewOnly: boolean;
  displayChoices: QuestionChoice[];
  onAnswerChange: (value: string) => void;
  onSortChange: (choices: QuestionChoice[]) => void;
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function QuestionRenderer({
  question,
  selectedAnswer,
  sortedChoices,
  isSubmitted,
  isCorrect,
  isViewOnly,
  displayChoices,
  onAnswerChange,
  onSortChange,
}: QuestionRendererProps) {
  const disabled = isSubmitted || isViewOnly;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl leading-relaxed">
            {question.text}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 capitalize">
            {question.difficulty}
          </Badge>
        </div>
        <Badge variant="secondary" className="w-fit text-xs">
          {question.category}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Multiple Choice */}
        {question.questionType === QuestionType.MULTIPLE_CHOICE && (
          <RadioGroup
            value={selectedAnswer ?? ''}
            onValueChange={(val) => {
              if (!disabled) onAnswerChange(val);
            }}
            className="space-y-3"
          >
            {displayChoices.map((choice) => {
              const isSelected = selectedAnswer === choice.id;
              const showFeedback = isSubmitted || isViewOnly;
              const isCorrectChoice = choice.isCorrect;

              return (
                <label
                  key={choice.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all',
                    showFeedback && isCorrectChoice
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : showFeedback && isSelected && !isCorrectChoice
                        ? 'border-red-500 bg-red-500/10'
                        : isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50',
                    disabled && 'cursor-default'
                  )}
                >
                  <RadioGroupItem
                    value={choice.id}
                    disabled={disabled}
                    className="shrink-0"
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <span className="font-semibold text-primary">
                      {choice.label}.
                    </span>
                    <span>{choice.text}</span>
                  </div>
                  {showFeedback && isCorrectChoice && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  )}
                  {showFeedback && isSelected && !isCorrectChoice && (
                    <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                </label>
              );
            })}
          </RadioGroup>
        )}

        {/* Sorting */}
        {question.questionType === QuestionType.SORTING && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag and drop items into the correct order.
            </p>
            <SortableList
              choices={sortedChoices}
              onOrderChange={(newOrder) => onSortChange(newOrder)}
              disabled={disabled}
            />
            {(isSubmitted || isViewOnly) && (
              <div className="space-y-2">
                {sortedChoices.map((choice, idx) => {
                  const inCorrectPosition = choice.correctOrder === idx + 1;
                  return (
                    <div
                      key={choice.id}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                        inCorrectPosition
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      )}
                    >
                      {inCorrectPosition ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>
                        {idx + 1}. {choice.text}
                        {!inCorrectPosition && (
                          <span className="ml-2 text-xs opacity-70">
                            (correct position: {choice.correctOrder})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Fill in the Blank */}
        {question.questionType === QuestionType.FILL_IN_BLANK && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fill-answer">Your Answer</Label>
              <Input
                id="fill-answer"
                type="text"
                value={selectedAnswer ?? ''}
                onChange={(e) => {
                  if (!disabled) onAnswerChange(e.target.value);
                }}
                placeholder="Type your answer here..."
                disabled={disabled}
                className={cn(
                  'text-lg',
                  (isSubmitted || isViewOnly) && isCorrect && 'border-emerald-500',
                  (isSubmitted || isViewOnly) && !isCorrect && 'border-red-500'
                )}
                autoComplete="off"
              />
            </div>
            {(isSubmitted || isViewOnly) && (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-lg border-2 p-4',
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-red-500 bg-red-500/10'
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                )}
                <div>
                  <p className={cn('font-semibold', isCorrect ? 'text-emerald-400' : 'text-red-400')}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  {!isCorrect && (
                    <p className="mt-1 text-sm text-red-400">
                      Correct answer:{' '}
                      <span className="font-semibold">
                        {question.choices[0]?.text}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/study/question-renderer.tsx
git commit -m "feat: extract question-renderer component from study-session"
```

---

### Task 5: Session Navigation & Question Grid Components

**Files:**
- Create: `components/study/session-navigation.tsx`
- Create: `components/study/question-grid.tsx`

- [ ] **Step 1: Create `components/study/session-navigation.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Grid3x3, Keyboard } from 'lucide-react';

interface SessionNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenGrid: () => void;
}

export function SessionNavigation({
  currentIndex,
  totalQuestions,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onOpenGrid,
}: SessionNavigationProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrev}
        disabled={!canGoPrev}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Q {currentIndex + 1} of {totalQuestions}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onOpenGrid}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Keyboard className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <p><kbd>←</kbd> / <kbd>→</kbd> Navigate</p>
                <p><kbd>G</kbd> Toggle grid</p>
                <p><kbd>1-4</kbd> Select MC answer</p>
                <p><kbd>Enter</kbd> Submit / Next</p>
                <p><kbd>Esc</kbd> Close grid</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={!canGoNext}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/study/question-grid.tsx`**

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ActiveSessionAnswer } from '@/types/question';

interface QuestionGridProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, ActiveSessionAnswer>;
  questionIds: string[];
  frontierIndex: number;
  onJump: (index: number) => void;
}

export function QuestionGrid({
  open,
  onOpenChange,
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
  frontierIndex,
  onJump,
}: QuestionGridProps) {
  const handleChipClick = (index: number) => {
    // Can't jump beyond frontier
    const targetIndex = index > frontierIndex ? frontierIndex : index;
    onJump(targetIndex);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Question Navigator</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const questionId = questionIds[i];
            const answer = questionId ? answers[questionId] : undefined;
            const isCurrent = i === currentIndex;
            const isAnswered = !!answer;
            const isCorrect = answer?.isCorrect;

            return (
              <button
                key={i}
                onClick={() => handleChipClick(i)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                  isCurrent && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-background',
                  isAnswered && isCorrect && 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
                  isAnswered && !isCorrect && 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
                  !isAnswered && 'bg-muted text-muted-foreground hover:bg-muted/80',
                  i > frontierIndex && 'opacity-40 cursor-not-allowed'
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-emerald-500/20" />
            Correct
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-red-500/20" />
            Incorrect
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-muted" />
            Unanswered
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm ring-2 ring-blue-500" />
            Current
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/study/session-navigation.tsx components/study/question-grid.tsx
git commit -m "feat: add session navigation bar and question grid navigator"
```

---

### Task 6: Session Summary Component

**Files:**
- Create: `components/study/session-summary.tsx`

- [ ] **Step 1: Create `components/study/session-summary.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Question, ActiveSessionAnswer } from '@/types/question';
import { formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface SessionSummaryProps {
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  topics: string[];
  questions: Question[];
  answers: Record<string, ActiveSessionAnswer>;
  questionIds: string[];
  missedCount: number;
  onRetryMissed: () => void;
  onBackToStudy: () => void;
}

export function SessionSummary({
  score,
  totalQuestions,
  durationSeconds,
  topics,
  questions,
  answers,
  questionIds,
  missedCount,
  onRetryMissed,
  onBackToStudy,
}: SessionSummaryProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  // Calculate weakest topic
  const topicStats: Record<string, { correct: number; total: number }> = {};
  for (const qId of questionIds) {
    const question = questions.find((q) => q.id === qId);
    const answer = answers[qId];
    if (!question || !answer) continue;

    if (!topicStats[question.category]) {
      topicStats[question.category] = { correct: 0, total: 0 };
    }
    topicStats[question.category].total++;
    if (answer.isCorrect) topicStats[question.category].correct++;
  }

  const weakestTopic = Object.entries(topicStats).length >= 2
    ? Object.entries(topicStats).sort(
        ([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total)
      )[0]
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="border-2 text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Trophy className="h-8 w-8 text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Session Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-5xl font-bold">{accuracy}%</p>
            <p className="text-muted-foreground">
              {score} of {totalQuestions} correct
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">Correct: {score}</span>
              <span className="text-red-400">Incorrect: {totalQuestions - score}</span>
            </div>
            <Progress value={accuracy} className="h-2" />
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Duration: <span className="font-semibold text-foreground">{formatDuration(durationSeconds)}</span></span>
            {topics.length > 0 && (
              <span>Topics: <span className="font-semibold text-foreground">{topics.length}</span></span>
            )}
          </div>

          {weakestTopic && (
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Weakest topic: </span>
              <span className="font-semibold text-foreground">{weakestTopic[0]}</span>
              <span className="text-muted-foreground"> ({weakestTopic[1].correct}/{weakestTopic[1].total}, {Math.round((weakestTopic[1].correct / weakestTopic[1].total) * 100)}%)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-question breakdown */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Per-Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto space-y-1">
          {questionIds.map((qId, idx) => {
            const question = questions.find((q) => q.id === qId);
            const answer = answers[qId];
            if (!question || !answer) return null;
            const isExpanded = expandedQuestion === qId;

            return (
              <div key={qId}>
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : qId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-6 shrink-0">Q{idx + 1}</span>
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span className="truncate flex-1">{question.text}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{question.category}</Badge>
                  {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="ml-8 mb-2 rounded-md bg-muted/30 p-3 text-sm space-y-1">
                    <p className="text-muted-foreground">{question.text}</p>
                    {question.explanation && (
                      <p className="text-xs text-muted-foreground italic">{question.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {missedCount > 0 && (
          <Button onClick={onRetryMissed} size="lg" variant="default">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Missed ({missedCount})
          </Button>
        )}
        <Button onClick={onBackToStudy} size="lg" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Study
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/study/session-summary.tsx
git commit -m "feat: add session summary component with per-question breakdown and retry"
```

---

### Task 7: Session Resume Banner Component

**Files:**
- Create: `components/study/session-resume-banner.tsx`

- [ ] **Step 1: Create `components/study/session-resume-banner.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ActiveSession } from '@/types/question';
import { Play, X } from 'lucide-react';

interface SessionResumeBannerProps {
  session: ActiveSession;
  onResume: () => void;
  onStartFresh: () => void;
}

const MODE_LABELS: Record<string, string> = {
  due: 'Due for Review',
  topic: 'By Topic',
  all: 'All Questions',
  new: 'New Questions',
};

export function SessionResumeBanner({
  session,
  onResume,
  onStartFresh,
}: SessionResumeBannerProps) {
  const answeredCount = Object.keys(session.answers).length;
  const totalCount = session.questionIds.length;
  const correctCount = Object.values(session.answers).filter((a) => a.isCorrect).length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  return (
    <Card className="border-2 border-primary/50 bg-primary/5">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Unfinished Session
            </span>
            <Badge variant="secondary" className="text-xs">
              {MODE_LABELS[session.mode] ?? session.mode}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {answeredCount}/{totalCount} questions • {accuracy}% correct
            {session.isRetry && ' • Retry session'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onResume} size="sm" className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
          <Button onClick={onStartFresh} size="sm" variant="ghost" className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Start Fresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/study/session-resume-banner.tsx
git commit -m "feat: add session resume banner component"
```

---

### Task 8: Study Session Orchestrator Rewrite

**Files:**
- Modify: `components/study/study-session.tsx` (full rewrite)

This is the largest task. The orchestrator manages all state, persistence, keyboard shortcuts, timer, and streak. It delegates rendering to the child components from Tasks 4-7.

- [ ] **Step 1: Rewrite `components/study/study-session.tsx`**

```typescript
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionRenderer } from '@/components/study/question-renderer';
import { SessionNavigation } from '@/components/study/session-navigation';
import { QuestionGrid } from '@/components/study/question-grid';
import { SessionSummary } from '@/components/study/session-summary';
import type {
  Question,
  QuestionChoice,
  StudySession as StudySessionType,
  ActiveSession,
  ActiveSessionAnswer,
} from '@/types/question';
import { QuestionType } from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import { updateReviewMetadata } from '@/lib/services/review-service';
import { cn, shuffleArray } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/format';
import { Flame, Clock } from 'lucide-react';

interface StudySessionProps {
  questions: Question[];
  topic: string;
  mode: 'due' | 'topic' | 'all' | 'new';
  selectedTopics?: string[];
  isRetry?: boolean;
  parentSessionId?: string;
  resumeSession?: ActiveSession | null;
  onComplete: (session: StudySessionType) => void;
  onRetryMissed: (activeSession: ActiveSession) => void;
  onBackToStudy: () => void;
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const activeSessionStorage = new LocalStorageAdapter<ActiveSession>(STORAGE_KEYS.ACTIVE_SESSION);

export function StudySession({
  questions,
  topic,
  mode,
  selectedTopics,
  isRetry = false,
  parentSessionId,
  resumeSession,
  onComplete,
  onRetryMissed,
  onBackToStudy,
}: StudySessionProps) {
  // Initialize session
  const [activeSession, setActiveSession] = useState<ActiveSession>(() => {
    if (resumeSession) return resumeSession;

    const shuffled = shuffleArray(questions);
    return {
      id: crypto.randomUUID(),
      mode,
      selectedTopics,
      questionIds: shuffled.map((q) => q.id),
      answers: {},
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      isRetry,
      parentSessionId,
    };
  });

  // Question map for quick lookups
  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    questions.forEach((q) => map.set(q.id, q));
    return map;
  }, [questions]);

  // Current question state
  const currentQuestionId = activeSession.questionIds[activeSession.currentIndex];
  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) : undefined;
  const currentAnswer = currentQuestionId ? activeSession.answers[currentQuestionId] : undefined;
  const isViewingPast = !!currentAnswer;
  const isSubmitted = isViewingPast;

  // Local state for the current (unanswered) question
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sortedChoices, setSortedChoices] = useState<QuestionChoice[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [justCorrect, setJustCorrect] = useState(false);

  // UI state
  const [gridOpen, setGridOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const sessionRecordedRef = useRef(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(activeSession.elapsedSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const isVisibleRef = useRef(true);

  // Frontier: first unanswered question index
  const frontierIndex = useMemo(() => {
    for (let i = 0; i < activeSession.questionIds.length; i++) {
      if (!activeSession.answers[activeSession.questionIds[i]]) return i;
    }
    return activeSession.questionIds.length; // all answered
  }, [activeSession.questionIds, activeSession.answers]);

  // Shuffled MC display choices — stored per question in a ref map so order stays stable
  // across navigation. Shuffled once per question per session.
  const choiceOrderRef = useRef<Map<string, QuestionChoice[]>>(new Map());

  const displayChoices = useMemo(() => {
    if (!currentQuestion || currentQuestion.questionType !== QuestionType.MULTIPLE_CHOICE) {
      return [];
    }
    // Check if we already have a shuffled order for this question
    const cached = choiceOrderRef.current.get(currentQuestion.id);
    if (cached) {
      return cached.map((c, i) => ({ ...c, label: LABELS[i] ?? String(i + 1) }));
    }
    // Shuffle and cache
    const shuffled = shuffleArray(currentQuestion.choices);
    choiceOrderRef.current.set(currentQuestion.id, shuffled);
    return shuffled.map((c, i) => ({
      ...c,
      label: LABELS[i] ?? String(i + 1),
    }));
  }, [currentQuestion]);

  // Initialize sorted choices for sorting questions
  useEffect(() => {
    if (currentQuestion?.questionType === QuestionType.SORTING && !isViewingPast) {
      setSortedChoices(currentQuestion.choices);
    }
  }, [currentQuestion, isViewingPast]);

  // Timer logic
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);

    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Auto-save
  const saveSession = useCallback((session: ActiveSession) => {
    if (saveFailed) return;
    const success = activeSessionStorage.set(session);
    if (!success) {
      setSaveFailed(true);
    }
  }, [saveFailed]);

  // Evaluate answer
  const evaluateAnswer = useCallback((): boolean => {
    if (!currentQuestion) return false;

    switch (currentQuestion.questionType) {
      case QuestionType.MULTIPLE_CHOICE: {
        const selected = displayChoices.find((c) => c.id === selectedAnswer);
        return selected?.isCorrect === true;
      }
      case QuestionType.SORTING:
        return sortedChoices.every((choice, index) => choice.correctOrder === index + 1);
      case QuestionType.FILL_IN_BLANK: {
        const correctText = currentQuestion.choices[0]?.text ?? '';
        return (selectedAnswer ?? '').trim().toLowerCase() === correctText.trim().toLowerCase();
      }
      default:
        return false;
    }
  }, [currentQuestion, selectedAnswer, sortedChoices, displayChoices]);

  // Can submit
  const canSubmit = useCallback((): boolean => {
    if (!currentQuestion || isViewingPast || justSubmitted) return false;
    switch (currentQuestion.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return selectedAnswer !== null;
      case QuestionType.SORTING:
        return true;
      case QuestionType.FILL_IN_BLANK:
        return (selectedAnswer ?? '').trim().length > 0;
      default:
        return false;
    }
  }, [currentQuestion, isViewingPast, justSubmitted, selectedAnswer]);

  // Submit answer
  const handleSubmit = useCallback((confidence: 'sure' | 'guessing') => {
    if (!currentQuestion || !currentQuestionId) return;

    const correct = evaluateAnswer();
    setJustSubmitted(true);
    setJustCorrect(correct);

    if (correct) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    // Determine the selected answer value for storage
    let answerValue: number | string | string[];
    switch (currentQuestion.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        // Store the choice ID string (not an index) so view-only mode can match it
        answerValue = selectedAnswer ?? '';
        break;
      case QuestionType.SORTING:
        answerValue = sortedChoices.map((c) => c.id);
        break;
      case QuestionType.FILL_IN_BLANK:
        answerValue = selectedAnswer ?? '';
        break;
      default:
        answerValue = selectedAnswer ?? '';
    }

    const answerEntry: ActiveSessionAnswer = {
      selectedAnswer: answerValue,
      isCorrect: correct,
      submittedAt: new Date().toISOString(),
      confidence,
    };

    // Update SM-2
    updateReviewMetadata(currentQuestionId, correct, confidence);

    // Update active session
    const updatedSession: ActiveSession = {
      ...activeSession,
      answers: { ...activeSession.answers, [currentQuestionId]: answerEntry },
      currentIndex: activeSession.currentIndex,
      elapsedSeconds,
    };

    setActiveSession(updatedSession);
    saveSession(updatedSession);
  }, [currentQuestion, currentQuestionId, evaluateAnswer, selectedAnswer, sortedChoices, displayChoices, activeSession, elapsedSeconds, saveSession]);

  // Navigate
  const handleNext = useCallback(() => {
    if (activeSession.currentIndex >= activeSession.questionIds.length - 1) {
      // Check if all questions are answered
      if (frontierIndex >= activeSession.questionIds.length) {
        handleSessionComplete(); // Record session immediately so it's saved even if tab closes
        setShowSummary(true);
        return;
      }
    }

    const nextIndex = Math.min(activeSession.currentIndex + 1, activeSession.questionIds.length - 1);
    // Don't go past frontier
    const clampedIndex = Math.min(nextIndex, frontierIndex);

    const updatedSession = { ...activeSession, currentIndex: clampedIndex, elapsedSeconds };
    setActiveSession(updatedSession);
    saveSession(updatedSession);

    setSelectedAnswer(null);
    setSortedChoices([]);
    setJustSubmitted(false);
    setJustCorrect(false);
  }, [activeSession, frontierIndex, elapsedSeconds, saveSession]);

  const handlePrev = useCallback(() => {
    if (activeSession.currentIndex <= 0) return;
    const prevIndex = activeSession.currentIndex - 1;
    const updatedSession = { ...activeSession, currentIndex: prevIndex, elapsedSeconds };
    setActiveSession(updatedSession);
    saveSession(updatedSession);

    setSelectedAnswer(null);
    setSortedChoices([]);
    setJustSubmitted(false);
    setJustCorrect(false);
  }, [activeSession, elapsedSeconds, saveSession]);

  const handleGridJump = useCallback((index: number) => {
    const updatedSession = { ...activeSession, currentIndex: index, elapsedSeconds };
    setActiveSession(updatedSession);
    saveSession(updatedSession);

    setSelectedAnswer(null);
    setSortedChoices([]);
    setJustSubmitted(false);
    setJustCorrect(false);
  }, [activeSession, elapsedSeconds, saveSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Suppress when grid is open (except G and Escape)
      if (gridOpen && e.key !== 'g' && e.key !== 'G' && e.key !== 'Escape') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (justSubmitted || isViewingPast) {
            handleNext();
          }
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          setGridOpen((o) => !o);
          break;
        case 'Escape':
          if (gridOpen) {
            e.preventDefault();
            setGridOpen(false);
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (justSubmitted || isViewingPast) {
            handleNext();
          } else if (canSubmit()) {
            handleSubmit('sure');
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          if (
            currentQuestion?.questionType === QuestionType.MULTIPLE_CHOICE &&
            !isViewingPast &&
            !justSubmitted
          ) {
            const idx = parseInt(e.key) - 1;
            if (idx < displayChoices.length) {
              setSelectedAnswer(displayChoices[idx].id);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridOpen, justSubmitted, isViewingPast, handlePrev, handleNext, handleSubmit, canSubmit, currentQuestion, displayChoices]);

  // Handle session completion — records StudySession and clears ActiveSession.
  // Guarded by ref to prevent double-recording.
  const handleSessionComplete = useCallback(() => {
    if (sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;

    const answeredCount = Object.keys(activeSession.answers).length;
    const correctCount = Object.values(activeSession.answers).filter((a) => a.isCorrect).length;
    const uniqueTopics = new Set(
      activeSession.questionIds
        .map((id) => questionMap.get(id)?.category)
        .filter(Boolean)
    );
    const topicLabel = uniqueTopics.size > 1 ? 'mixed' : (Array.from(uniqueTopics)[0] ?? 'mixed');

    const session: StudySessionType = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      topic: topicLabel,
      totalQuestions: answeredCount,
      correctAnswers: correctCount,
      accuracy: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
      duration: elapsedSeconds,
      mode: activeSession.mode,
      isRetry: activeSession.isRetry || undefined,
      parentSessionId: activeSession.parentSessionId,
    };

    // Clear active session from storage
    activeSessionStorage.remove();

    onComplete(session);
  }, [activeSession, questionMap, elapsedSeconds, onComplete]);

  // Handle retry missed
  const handleRetryMissed = useCallback(() => {
    // First, complete the current session
    handleSessionComplete();

    // Create retry session with missed questions
    const missedIds = activeSession.questionIds.filter(
      (id) => activeSession.answers[id] && !activeSession.answers[id].isCorrect
    );

    const retrySession: ActiveSession = {
      id: crypto.randomUUID(),
      mode: activeSession.mode,
      selectedTopics: activeSession.selectedTopics,
      questionIds: shuffleArray(missedIds),
      answers: {},
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      isRetry: true,
      parentSessionId: activeSession.id,
    };

    activeSessionStorage.set(retrySession);
    onRetryMissed(retrySession);
  }, [activeSession, handleSessionComplete, onRetryMissed]);

  // Show summary screen
  if (showSummary) {
    const score = Object.values(activeSession.answers).filter((a) => a.isCorrect).length;
    const missedCount = Object.values(activeSession.answers).filter((a) => !a.isCorrect).length;
    const topics = [...new Set(
      activeSession.questionIds.map((id) => questionMap.get(id)?.category).filter(Boolean) as string[]
    )];

    return (
      <SessionSummary
        score={score}
        totalQuestions={activeSession.questionIds.length}
        durationSeconds={elapsedSeconds}
        topics={topics}
        questions={questions}
        answers={activeSession.answers}
        questionIds={activeSession.questionIds}
        missedCount={missedCount}
        onRetryMissed={handleRetryMissed}
        onBackToStudy={() => {
          handleSessionComplete();
          onBackToStudy();
        }}
      />
    );
  }

  if (!currentQuestion) return null;

  const answeredCount = Object.keys(activeSession.answers).length;
  const totalQ = activeSession.questionIds.length;
  const score = Object.values(activeSession.answers).filter((a) => a.isCorrect).length;
  const progressPercent = ((answeredCount + (justSubmitted ? 1 : 0)) / totalQ) * 100;
  const isAtFrontier = activeSession.currentIndex === frontierIndex;
  const canGoNext = isViewingPast || justSubmitted;
  const canGoPrev = activeSession.currentIndex > 0;

  return (
    <div className="space-y-4">
      {/* Top bar: progress, score, timer, streak */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium">
            Question {activeSession.currentIndex + 1} of {totalQ}
          </span>
          <div className="flex items-center gap-3">
            {streak >= 2 && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Flame className="h-4 w-4" />
                {streak}
              </span>
            )}
            <Badge variant="secondary">
              {score} correct
            </Badge>
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(elapsedSeconds)}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* View-only indicator */}
      {isViewingPast && (
        <div className="rounded-md bg-muted/50 px-3 py-1.5 text-center text-xs text-muted-foreground">
          Viewing previous answer (read-only)
        </div>
      )}

      {/* Question content */}
      <QuestionRenderer
        question={currentQuestion}
        selectedAnswer={isViewingPast ? String(currentAnswer?.selectedAnswer ?? '') : selectedAnswer}
        sortedChoices={sortedChoices}
        isSubmitted={isViewingPast || justSubmitted}
        isCorrect={isViewingPast ? (currentAnswer?.isCorrect ?? false) : justCorrect}
        isViewOnly={isViewingPast}
        displayChoices={displayChoices}
        onAnswerChange={setSelectedAnswer}
        onSortChange={setSortedChoices}
      />

      {/* Submit buttons (only for unanswered questions at frontier) */}
      {!isViewingPast && !justSubmitted && isAtFrontier && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => handleSubmit('guessing')}
            disabled={!canSubmit()}
            variant="outline"
            size="lg"
          >
            Guessing
          </Button>
          <Button
            onClick={() => handleSubmit('sure')}
            disabled={!canSubmit()}
            size="lg"
          >
            Submit
          </Button>
        </div>
      )}

      {/* Next button after submission */}
      {(justSubmitted) && (
        <div className="flex justify-end">
          <Button onClick={handleNext} size="lg">
            {frontierIndex >= totalQ ? 'Finish' : 'Next Question'}
          </Button>
        </div>
      )}

      {/* Storage warning */}
      {saveFailed && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
          Session auto-save failed — storage full. Your session will continue but cannot be resumed if you leave.
        </div>
      )}

      {/* Navigation bar */}
      <SessionNavigation
        currentIndex={activeSession.currentIndex}
        totalQuestions={totalQ}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={handlePrev}
        onNext={handleNext}
        onOpenGrid={() => setGridOpen(true)}
      />

      {/* Question grid modal */}
      <QuestionGrid
        open={gridOpen}
        onOpenChange={setGridOpen}
        totalQuestions={totalQ}
        currentIndex={activeSession.currentIndex}
        answers={activeSession.answers}
        questionIds={activeSession.questionIds}
        frontierIndex={frontierIndex}
        onJump={handleGridJump}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS (may have errors to fix — resolve iteratively)

- [ ] **Step 3: Commit**

```bash
git add components/study/study-session.tsx
git commit -m "feat: rewrite study-session as orchestrator with persistence, timer, keyboard, streak"
```

---

### Task 9: Study Page Updates — Resume, Due-by-Topic, Integration

**Files:**
- Modify: `app/study/page.tsx`

- [ ] **Step 1: Rewrite `app/study/page.tsx`**

Full rewrite to integrate resume banner, due-by-topic flow, and new `StudySession` props:

```typescript
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudySession } from '@/components/study/study-session';
import { SessionResumeBanner } from '@/components/study/session-resume-banner';
import type {
  Question,
  StudySession as StudySessionType,
  ActiveSession,
} from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import {
  getDueQuestions,
  getDueQuestionsByTopic,
  getNewQuestions,
  getReviewStats,
} from '@/lib/services/review-service';
import { cn } from '@/lib/utils';
import {
  Clock,
  BookOpen,
  Layers,
  Sparkles,
  ArrowLeft,
  Check,
} from 'lucide-react';

type StudyMode = 'due' | 'topic' | 'all' | 'new';
type Phase = 'mode-select' | 'topic-select' | 'due-topic-select' | 'quiz';

const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySessionType[]>(STORAGE_KEYS.SESSIONS);
const activeSessionStorage = new LocalStorageAdapter<ActiveSession>(STORAGE_KEYS.ACTIVE_SESSION);

function StudyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('mode-select');
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [savedSession, setSavedSession] = useState<ActiveSession | null>(null);
  const [resumeSession, setResumeSession] = useState<ActiveSession | null>(null);

  // Load questions and check for saved session
  useEffect(() => {
    const stored = questionsStorage.get();
    if (stored) setAllQuestions(stored);

    const saved = activeSessionStorage.get();
    if (saved) {
      // Validate question IDs still exist
      const storedQuestions = questionsStorage.get() ?? [];
      const questionIds = new Set(storedQuestions.map((q) => q.id));
      const validIds = saved.questionIds.filter((id) => questionIds.has(id));

      if (validIds.length === 0) {
        activeSessionStorage.remove();
      } else {
        const validSession = { ...saved, questionIds: validIds };
        // Adjust currentIndex if needed
        if (validSession.currentIndex >= validIds.length) {
          validSession.currentIndex = validIds.length - 1;
        }
        setSavedSession(validSession);
      }
    }
  }, []);

  // Auto-select mode from query param
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'due' || mode === 'topic' || mode === 'all' || mode === 'new') {
      setSelectedMode(mode);
    }
  }, [searchParams]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allQuestions.forEach((q) => cats.add(q.category));
    return Array.from(cats).sort();
  }, [allQuestions]);

  const stats = useMemo(() => {
    if (allQuestions.length === 0) return null;
    return getReviewStats(allQuestions);
  }, [allQuestions]);

  const dueQuestions = useMemo(() => getDueQuestions(allQuestions), [allQuestions]);
  const dueByTopic = useMemo(() => getDueQuestionsByTopic(allQuestions), [allQuestions]);
  const newQuestions = useMemo(() => getNewQuestions(allQuestions), [allQuestions]);

  const handleModeSelect = (mode: StudyMode) => {
    setSelectedMode(mode);
    if (mode === 'due') {
      setPhase('due-topic-select');
      // Pre-check all topics that have due questions
      setSelectedCategories(new Set(Object.keys(dueByTopic)));
    } else if (mode === 'topic') {
      setPhase('topic-select');
    } else {
      setPhase('quiz');
    }
  };

  const handleStartStudy = () => {
    if (selectedCategories.size > 0) {
      setPhase('quiz');
    }
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleResume = () => {
    if (savedSession) {
      setResumeSession(savedSession);
      setSelectedMode(savedSession.mode);
      setSavedSession(null);
      setPhase('quiz');
    }
  };

  const handleStartFresh = () => {
    activeSessionStorage.remove();
    setSavedSession(null);
    setResumeSession(null);
  };

  const quizQuestions = useMemo((): Question[] => {
    // If resuming, return all questions (the session has its own questionIds)
    if (resumeSession) return allQuestions;

    switch (selectedMode) {
      case 'due':
        return dueQuestions.filter((q) => selectedCategories.has(q.category));
      case 'topic':
        return allQuestions.filter((q) => selectedCategories.has(q.category));
      case 'all':
        return allQuestions;
      case 'new':
        return newQuestions;
      default:
        return [];
    }
  }, [selectedMode, allQuestions, dueQuestions, newQuestions, selectedCategories, resumeSession]);

  const topicLabel = useMemo((): string => {
    if (selectedCategories.size === 1) return Array.from(selectedCategories)[0];
    switch (selectedMode) {
      case 'due':
        return 'mixed';
      case 'topic':
        return selectedCategories.size === 1 ? Array.from(selectedCategories)[0] : 'mixed';
      case 'all':
        return 'mixed';
      case 'new':
        return 'mixed';
      default:
        return 'mixed';
    }
  }, [selectedMode, selectedCategories]);

  const handleComplete = (session: StudySessionType) => {
    const existing = sessionsStorage.get() ?? [];
    sessionsStorage.set([session, ...existing]);
  };

  const handleRetryMissed = (retryActiveSession: ActiveSession) => {
    setResumeSession(retryActiveSession);
    setPhase('quiz');
  };

  const handleBackToStudy = useCallback(() => {
    setPhase('mode-select');
    setSelectedMode(null);
    setSelectedCategories(new Set());
    setResumeSession(null);
    // Refresh questions and stats
    const stored = questionsStorage.get();
    if (stored) setAllQuestions(stored);
  }, []);

  // Phase 1: Mode Selection
  if (phase === 'mode-select') {
    const modes: {
      mode: StudyMode;
      title: string;
      description: string;
      count: number;
      icon: React.ReactNode;
      color: string;
    }[] = [
      {
        mode: 'due',
        title: 'Due for Review',
        description: 'Questions due based on spaced repetition schedule',
        count: dueQuestions.length,
        icon: <Clock className="h-6 w-6" />,
        color: 'text-amber-400',
      },
      {
        mode: 'topic',
        title: 'By Topic',
        description: 'Choose specific categories to study',
        count: allQuestions.length,
        icon: <BookOpen className="h-6 w-6" />,
        color: 'text-blue-400',
      },
      {
        mode: 'all',
        title: 'All Questions',
        description: 'Study your entire question bank',
        count: allQuestions.length,
        icon: <Layers className="h-6 w-6" />,
        color: 'text-purple-400',
      },
      {
        mode: 'new',
        title: 'New Questions',
        description: 'Questions you have not studied yet',
        count: newQuestions.length,
        icon: <Sparkles className="h-6 w-6" />,
        color: 'text-emerald-400',
      },
    ];

    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Study</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a study mode to get started.
          </p>
        </div>

        {/* Resume banner */}
        {savedSession && (
          <SessionResumeBanner
            session={savedSession}
            onResume={handleResume}
            onStartFresh={handleStartFresh}
          />
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.due}</p>
              <p className="text-xs text-muted-foreground">Due</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.new}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.learning}</p>
              <p className="text-xs text-muted-foreground">Learning</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map(({ mode, title, description, count, icon, color }) => (
            <Card
              key={mode}
              className={cn(
                'cursor-pointer border-2 transition-all hover:border-primary/50 hover:shadow-md',
                count === 0 && 'pointer-events-none opacity-50'
              )}
              onClick={() => count > 0 && handleModeSelect(mode)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={cn('rounded-lg bg-muted p-2', color)}>
                    {icon}
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Phase: Due Topic Selection
  if (phase === 'due-topic-select') {
    const topicNames = Object.keys(dueByTopic).sort();
    const allTopicNames = categories;
    const selectedDueCount = Array.from(selectedCategories).reduce(
      (sum, cat) => sum + (dueByTopic[cat]?.length ?? 0), 0
    );

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPhase('mode-select')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Due for Review — Select Topics</h1>
            <p className="text-sm text-muted-foreground">Choose which topics to review.</p>
          </div>
        </div>

        <div className="space-y-2">
          {allTopicNames.map((cat) => {
            const dueCount = dueByTopic[cat]?.length ?? 0;
            const hasDue = dueCount > 0;
            const isSelected = selectedCategories.has(cat);

            return (
              <div
                key={cat}
                onClick={() => hasDue && handleToggleCategory(cat)}
                className={cn(
                  'flex items-center justify-between rounded-lg border-2 p-4 transition-all',
                  !hasDue && 'opacity-40 cursor-not-allowed',
                  hasDue && 'cursor-pointer',
                  hasDue && isSelected
                    ? 'border-primary bg-primary/5'
                    : hasDue
                      ? 'border-border hover:border-primary/50'
                      : 'border-border',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="font-medium">{cat}</span>
                </div>
                <Badge variant={hasDue ? 'secondary' : 'outline'}>
                  {dueCount} due
                </Badge>
              </div>
            );
          })}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={selectedCategories.size === 0}
          onClick={handleStartStudy}
        >
          Start Review ({selectedDueCount} questions)
        </Button>
      </div>
    );
  }

  // Phase: Topic Selection (By Topic mode — unchanged)
  if (phase === 'topic-select') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPhase('mode-select')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Select Topics</h1>
            <p className="text-sm text-muted-foreground">Choose which categories to study.</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => {
            if (selectedCategories.size === categories.length) setSelectedCategories(new Set());
            else setSelectedCategories(new Set(categories));
          }}>
            {selectedCategories.size === categories.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedCategories.size} of {categories.length} selected
          </span>
        </div>

        <div className="space-y-2">
          {categories.map((cat) => {
            const catCount = allQuestions.filter((q) => q.category === cat).length;
            const isSelected = selectedCategories.has(cat);

            return (
              <div
                key={cat}
                onClick={() => handleToggleCategory(cat)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                    isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="font-medium">{cat}</span>
                </div>
                <Badge variant="outline">{catCount}</Badge>
              </div>
            );
          })}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={selectedCategories.size === 0}
          onClick={handleStartStudy}
        >
          Start Study ({allQuestions.filter((q) => selectedCategories.has(q.category)).length} questions)
        </Button>
      </div>
    );
  }

  // Phase: Quiz
  if (phase === 'quiz') {
    if (quizQuestions.length === 0 && !resumeSession) {
      return (
        <div className="mx-auto max-w-md text-center space-y-4 py-12">
          <p className="text-lg text-muted-foreground">No questions available for this mode.</p>
          <Button onClick={handleBackToStudy}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Mode Selection
          </Button>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-3xl">
        <StudySession
          questions={quizQuestions}
          topic={topicLabel}
          mode={selectedMode ?? 'all'}
          selectedTopics={Array.from(selectedCategories)}
          isRetry={resumeSession?.isRetry}
          parentSessionId={resumeSession?.parentSessionId}
          resumeSession={resumeSession}
          onComplete={(session) => {
            handleComplete(session);
          }}
          onRetryMissed={handleRetryMissed}
          onBackToStudy={handleBackToStudy}
        />
      </div>
    );
  }

  return null;
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <StudyPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify — run type-check**

Run: `bun run type-check`
Expected: PASS (fix any type errors iteratively)

- [ ] **Step 3: Commit**

```bash
git add app/study/page.tsx
git commit -m "feat: update study page with resume banner, due-by-topic flow, and new session integration"
```

---

### Task 10: Home Page — Resume Banner Integration

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add resume banner to Home page**

Add imports at top of `app/page.tsx`:

```typescript
import { SessionResumeBanner } from '@/components/study/session-resume-banner';
import type { ActiveSession } from '@/types/question';
```

Add state and effect inside the `Home` component, after the existing state declarations:

```typescript
const [activeStudySession, setActiveStudySession] = useState<ActiveSession | null>(null);
```

In the existing `useEffect`, add after `setLoaded(true)`:

```typescript
const activeSession = new LocalStorageAdapter<ActiveSession>(STORAGE_KEYS.ACTIVE_SESSION).get();
if (activeSession) {
  // Validate question IDs still exist
  const questionIds = new Set(qs.map((q: Question) => q.id));
  const validIds = activeSession.questionIds.filter((id: string) => questionIds.has(id));
  if (validIds.length > 0) {
    setActiveStudySession(activeSession);
  }
}
```

In the dashboard JSX (between the header section and quick stats section), add:

```tsx
{activeStudySession && (
  <SessionResumeBanner
    session={activeStudySession}
    onResume={() => router.push('/study')}
    onStartFresh={() => {
      new LocalStorageAdapter<ActiveSession>(STORAGE_KEYS.ACTIVE_SESSION).remove();
      setActiveStudySession(null);
    }}
  />
)}
```

Also add `useRouter` import and call at the top of the `Home` component:

```typescript
const router = useRouter();
```

And add the import:

```typescript
import { useRouter } from 'next/navigation';
```

- [ ] **Step 2: Update topic display for backward compatibility**

The existing line:
```tsx
{session.topic === 'mixed' ? 'Mixed Topics' : session.topic}
```

This already handles `'mixed'` correctly. No change needed.

- [ ] **Step 3: Update the `formatDuration` in home page to use shared utility**

Replace the local `formatDuration` function with the import:

```typescript
import { formatDurationHuman, formatDate } from '@/lib/utils/format';
```

Remove the local `formatDuration` and `formatDate` functions, and update usages:
- Replace `formatDuration(session.duration)` with `formatDurationHuman(session.duration)`
- Replace `formatDate(session.date)` with `formatDate(session.date)` (same name, just imported)

- [ ] **Step 4: Verify — run type-check and lint**

Run: `bun run type-check && bun run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add resume banner and shared format utilities to home page"
```

---

### Task 11: Final Polish & Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full type-check**

Run: `bun run type-check`
Expected: PASS with no errors

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: PASS with no warnings

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: All routes build successfully

- [ ] **Step 4: Fix any errors found in Steps 1-3**

Iteratively fix type errors, lint issues, or build failures. Common issues to watch for:
- Missing imports
- `prefer-const` lint rule on `let` variables
- Unused imports or variables
- Type mismatches between component props

- [ ] **Step 5: Start dev server and verify visually**

Run: `bun run dev`

Verification checklist:
1. Home page: Shows resume banner if active session exists
2. Study page: Shows resume banner, mode cards with correct counts
3. Click "Due for Review": Shows topic selection with per-topic due counts
4. Start a session: Timer runs, question renders correctly
5. Submit with "Submit" and "Guessing" buttons: Both work, SM-2 updates correctly
6. Navigate with Prev/Next: Past questions show view-only
7. Open question grid (G key or button): Grid shows with correct color coding
8. Navigate away and return: Resume banner appears with correct progress
9. Complete a session: Summary shows with per-question breakdown
10. Click "Retry Missed": New session starts with only wrong answers
11. Keyboard shortcuts: ←, →, G, 1-4, Enter, Escape all work
12. Streak counter: Shows after 2+ consecutive correct answers
13. Theme toggle: Both dark and light modes render correctly
14. Mobile responsive: Navigation bar, grid, and summary work on small screens

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final polish and verification fixes for study session enhancements"
```
