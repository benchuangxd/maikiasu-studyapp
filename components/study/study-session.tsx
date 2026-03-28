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
import { shuffleArray } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/format';
import { Flame, Clock } from 'lucide-react';

interface StudySessionProps {
  questions: Question[];
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

  // Local state for the current (unanswered) question
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set());
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
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
  const choiceOrderRef = useRef<Map<string, QuestionChoice[]>>(new Map());

  const displayChoices = useMemo(() => {
    if (!currentQuestion || (
      currentQuestion.questionType !== QuestionType.MULTIPLE_CHOICE &&
      currentQuestion.questionType !== QuestionType.MULTI_SELECT &&
      currentQuestion.questionType !== QuestionType.MATCHING
    )) {
      return [];
    }
    const cached = choiceOrderRef.current.get(currentQuestion.id);
    if (cached) {
      // MATCHING doesn't use letter labels — keep original label (term text)
      if (currentQuestion.questionType === QuestionType.MATCHING) return cached;
      return cached.map((c, i) => ({ ...c, label: LABELS[i] ?? String(i + 1) }));
    }
    const shuffled = shuffleArray(currentQuestion.choices);
    choiceOrderRef.current.set(currentQuestion.id, shuffled);
    if (currentQuestion.questionType === QuestionType.MATCHING) return shuffled;
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
      case QuestionType.MULTI_SELECT: {
        const correctIds = new Set(displayChoices.filter((c) => c.isCorrect).map((c) => c.id));
        if (selectedAnswers.size !== correctIds.size) return false;
        for (const id of selectedAnswers) {
          if (!correctIds.has(id)) return false;
        }
        return true;
      }
      case QuestionType.MATCHING:
        return currentQuestion.choices.every(
          (c) => c.correctOrder !== undefined && matchingAnswers[c.id] === String(c.correctOrder)
        );
      case QuestionType.SORTING:
        return sortedChoices.every((choice, index) => choice.correctOrder === index + 1);
      case QuestionType.FILL_IN_BLANK: {
        const correctText = currentQuestion.choices[0]?.text ?? '';
        return (selectedAnswer ?? '').trim().toLowerCase() === correctText.trim().toLowerCase();
      }
      default:
        return false;
    }
  }, [currentQuestion, selectedAnswer, selectedAnswers, matchingAnswers, sortedChoices, displayChoices]);

  // Can submit
  const canSubmit = useCallback((): boolean => {
    if (!currentQuestion || isViewingPast || justSubmitted) return false;
    switch (currentQuestion.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return selectedAnswer !== null;
      case QuestionType.MULTI_SELECT:
        return selectedAnswers.size > 0;
      case QuestionType.MATCHING:
        return currentQuestion.choices.every((c) => !!matchingAnswers[c.id]);
      case QuestionType.SORTING:
        return true;
      case QuestionType.FILL_IN_BLANK:
        return (selectedAnswer ?? '').trim().length > 0;
      default:
        return false;
    }
  }, [currentQuestion, isViewingPast, justSubmitted, selectedAnswer, selectedAnswers, matchingAnswers]);

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
        answerValue = selectedAnswer ?? '';
        break;
      case QuestionType.MULTI_SELECT:
        answerValue = Array.from(selectedAnswers);
        break;
      case QuestionType.MATCHING:
        // Store as array of "choiceId:selectedNum" pairs for view-only reconstruction
        answerValue = Object.entries(matchingAnswers).map(([id, val]) => `${id}:${val}`);
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
  }, [currentQuestion, currentQuestionId, evaluateAnswer, selectedAnswer, selectedAnswers, matchingAnswers, sortedChoices, activeSession, elapsedSeconds, saveSession]);

  // Navigate
  const handleNext = useCallback(() => {
    if (activeSession.currentIndex >= activeSession.questionIds.length - 1) {
      // Check if all questions are answered
      if (frontierIndex >= activeSession.questionIds.length) {
        handleSessionComplete();
        setShowSummary(true);
        return;
      }
    }

    const nextIndex = Math.min(activeSession.currentIndex + 1, activeSession.questionIds.length - 1);
    const clampedIndex = Math.min(nextIndex, frontierIndex);

    const updatedSession = { ...activeSession, currentIndex: clampedIndex, elapsedSeconds };
    setActiveSession(updatedSession);
    saveSession(updatedSession);

    setSelectedAnswer(null);
    setSelectedAnswers(new Set());
    setMatchingAnswers({});
    setSortedChoices([]);
    setJustSubmitted(false);
    setJustCorrect(false);
  }, [activeSession, frontierIndex, elapsedSeconds, saveSession, handleSessionComplete]);

  const handlePrev = useCallback(() => {
    if (activeSession.currentIndex <= 0) return;
    const prevIndex = activeSession.currentIndex - 1;
    const updatedSession = { ...activeSession, currentIndex: prevIndex, elapsedSeconds };
    setActiveSession(updatedSession);
    saveSession(updatedSession);

    setSelectedAnswer(null);
    setSelectedAnswers(new Set());
    setMatchingAnswers({});
    setSortedChoices([]);
    setJustSubmitted(false);
    setJustCorrect(false);
  }, [activeSession, elapsedSeconds, saveSession]);

  const handleGridJump = useCallback((index: number) => {
    const updatedSession = { ...activeSession, currentIndex: index, elapsedSeconds };
    setActiveSession(updatedSession);
    saveSession(updatedSession);

    setSelectedAnswer(null);
    setSelectedAnswers(new Set());
    setMatchingAnswers({});
    setSortedChoices([]);
    setJustSubmitted(false);
    setJustCorrect(false);
  }, [activeSession, elapsedSeconds, saveSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Suppress when grid is open (except G and Escape)
      if (gridOpen && e.key !== 'g' && e.key !== 'G' && e.key !== 'Escape') return;

      // Don't intercept when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

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
        case '5':
        case '6':
        case '7':
        case '8':
          if (!isViewingPast && !justSubmitted) {
            const idx = parseInt(e.key) - 1;
            if (idx < displayChoices.length) {
              if (currentQuestion?.questionType === QuestionType.MULTIPLE_CHOICE) {
                setSelectedAnswer(displayChoices[idx].id);
              } else if (currentQuestion?.questionType === QuestionType.MULTI_SELECT) {
                const choiceId = displayChoices[idx].id;
                setSelectedAnswers((prev) => {
                  const next = new Set(prev);
                  if (next.has(choiceId)) {
                    next.delete(choiceId);
                  } else {
                    next.add(choiceId);
                  }
                  return next;
                });
              }
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridOpen, justSubmitted, isViewingPast, handlePrev, handleNext, handleSubmit, canSubmit, currentQuestion, displayChoices]);

  // Handle retry missed
  const handleRetryMissed = useCallback(() => {
    handleSessionComplete();

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
        selectedAnswers={
          isViewingPast
            ? (Array.isArray(currentAnswer?.selectedAnswer) ? currentAnswer.selectedAnswer as string[] : [])
            : Array.from(selectedAnswers)
        }
        matchingAnswers={
          isViewingPast && Array.isArray(currentAnswer?.selectedAnswer)
            ? Object.fromEntries(
                (currentAnswer.selectedAnswer as string[])
                  .filter((s) => s.includes(':'))
                  .map((s) => { const [id, val] = s.split(':'); return [id, val]; })
              )
            : matchingAnswers
        }
        sortedChoices={sortedChoices}
        isSubmitted={isViewingPast || justSubmitted}
        isCorrect={isViewingPast ? (currentAnswer?.isCorrect ?? false) : justCorrect}
        isViewOnly={isViewingPast}
        displayChoices={displayChoices}
        onAnswerChange={setSelectedAnswer}
        onToggleAnswer={(choiceId) => {
          setSelectedAnswers((prev) => {
            const next = new Set(prev);
            if (next.has(choiceId)) next.delete(choiceId);
            else next.add(choiceId);
            return next;
          });
        }}
        onMatchingChange={(choiceId, value) => {
          setMatchingAnswers((prev) => ({ ...prev, [choiceId]: value }));
        }}
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
