'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

  // Phase: Topic Selection (By Topic mode)
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
          key={resumeSession?.id ?? selectedMode}
          questions={quizQuestions}
          mode={selectedMode ?? 'all'}
          selectedTopics={Array.from(selectedCategories)}
          isRetry={resumeSession?.isRetry}
          parentSessionId={resumeSession?.parentSessionId}
          resumeSession={resumeSession}
          onComplete={handleComplete}
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
