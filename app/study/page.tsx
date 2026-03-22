'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StudySession } from '@/components/study/study-session';
import type { Question, StudySession as StudySessionType } from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import {
  getDueQuestions,
  getNewQuestions,
  getReviewStats,
} from '@/lib/services/review-service';
import { cn } from '@/lib/utils';
import {
  Clock,
  BookOpen,
  Layers,
  Sparkles,
  Trophy,
  ArrowLeft,
  RotateCcw,
  Home,
  Check,
} from 'lucide-react';

type StudyMode = 'due' | 'topic' | 'all' | 'new';
type Phase = 'mode-select' | 'topic-select' | 'quiz' | 'summary';

const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySessionType[]>(STORAGE_KEYS.SESSIONS);

function StudyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('mode-select');
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [completedSession, setCompletedSession] = useState<StudySessionType | null>(null);

  // Load questions from localStorage
  useEffect(() => {
    const stored = questionsStorage.get();
    if (stored) {
      setAllQuestions(stored);
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
  const newQuestions = useMemo(() => getNewQuestions(allQuestions), [allQuestions]);

  const handleModeSelect = (mode: StudyMode) => {
    setSelectedMode(mode);
    if (mode === 'topic') {
      setPhase('topic-select');
    } else {
      setPhase('quiz');
    }
  };

  const handleStartTopicStudy = () => {
    if (selectedCategories.size > 0) {
      setPhase('quiz');
    }
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories));
    }
  };

  const quizQuestions = useMemo((): Question[] => {
    switch (selectedMode) {
      case 'due':
        return dueQuestions;
      case 'topic':
        return allQuestions.filter((q) => selectedCategories.has(q.category));
      case 'all':
        return allQuestions;
      case 'new':
        return newQuestions;
      default:
        return [];
    }
  }, [selectedMode, allQuestions, dueQuestions, newQuestions, selectedCategories]);

  const topicLabel = useMemo((): string => {
    switch (selectedMode) {
      case 'due':
        return 'Due for Review';
      case 'topic':
        return Array.from(selectedCategories).join(', ');
      case 'all':
        return 'All Questions';
      case 'new':
        return 'New Questions';
      default:
        return 'mixed';
    }
  }, [selectedMode, selectedCategories]);

  const handleComplete = (session: StudySessionType) => {
    // Save session to localStorage
    const existing = sessionsStorage.get() ?? [];
    sessionsStorage.set([session, ...existing]);
    setCompletedSession(session);
    setPhase('summary');
  };

  const handleStudyAgain = () => {
    setPhase('mode-select');
    setSelectedMode(null);
    setSelectedCategories(new Set());
    setCompletedSession(null);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Phase 2: Topic Selection
  if (phase === 'topic-select') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPhase('mode-select')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Select Topics</h1>
            <p className="text-sm text-muted-foreground">
              Choose which categories to study.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleToggleAll}>
            {selectedCategories.size === categories.length
              ? 'Deselect All'
              : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedCategories.size} of {categories.length} selected
          </span>
        </div>

        <div className="space-y-2">
          {categories.map((cat) => {
            const catCount = allQuestions.filter(
              (q) => q.category === cat
            ).length;
            const isSelected = selectedCategories.has(cat);

            return (
              <div
                key={cat}
                onClick={() => handleToggleCategory(cat)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
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
                <Badge variant="outline">{catCount}</Badge>
              </div>
            );
          })}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={selectedCategories.size === 0}
          onClick={handleStartTopicStudy}
        >
          Start Study ({allQuestions.filter((q) => selectedCategories.has(q.category)).length} questions)
        </Button>
      </div>
    );
  }

  // Phase 3: Quiz
  if (phase === 'quiz') {
    if (quizQuestions.length === 0) {
      return (
        <div className="mx-auto max-w-md text-center space-y-4 py-12">
          <p className="text-lg text-muted-foreground">
            No questions available for this mode.
          </p>
          <Button onClick={handleStudyAgain}>
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
          selectedTopics={selectedMode === 'topic' ? Array.from(selectedCategories) : undefined}
          onComplete={handleComplete}
          onRetryMissed={(retrySession) => {
            // Retry missed: the orchestrator has already set up the new ActiveSession,
            // just transition back to quiz phase so the component re-mounts with
            // the retry session picked up from storage on next load.
            // For now we simply reset to mode-select so the user can restart.
            handleStudyAgain();
          }}
          onBackToStudy={handleStudyAgain}
        />
      </div>
    );
  }

  // Phase 4: Summary
  if (phase === 'summary' && completedSession) {
    const { correctAnswers, totalQuestions, accuracy, duration } =
      completedSession;

    return (
      <div className="mx-auto max-w-md space-y-6">
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
                {correctAnswers} of {totalQuestions} correct
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">
                  Correct: {correctAnswers}
                </span>
                <span className="text-red-400">
                  Incorrect: {totalQuestions - correctAnswers}
                </span>
              </div>
              <Progress value={accuracy} className="h-2" />
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                Time spent:{' '}
                <span className="font-semibold text-foreground">
                  {formatDuration(duration)}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={handleStudyAgain} variant="outline" size="lg">
                <RotateCcw className="mr-2 h-4 w-4" />
                Study Again
              </Button>
              <Button onClick={() => router.push('/')} size="lg">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
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
