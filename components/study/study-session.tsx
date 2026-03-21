'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SortableList } from '@/components/study/sortable-list';
import type { Question, QuestionChoice, StudySession as StudySessionType } from '@/types/question';
import { QuestionType } from '@/types/question';
import { updateReviewMetadata } from '@/lib/services/review-service';
import { cn, shuffleArray } from '@/lib/utils';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

interface StudySessionProps {
  questions: Question[];
  topic: string;
  onComplete: (session: StudySessionType) => void;
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function StudySession({ questions, topic, onComplete }: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sortedChoices, setSortedChoices] = useState<QuestionChoice[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(() => Date.now());

  const shuffledQuestions = useMemo(() => shuffleArray(questions), [questions]);

  const currentQuestion = shuffledQuestions[currentIndex];

  // Shuffle MC choices once per question, reassign labels
  const displayChoices = useMemo(() => {
    if (!currentQuestion || currentQuestion.questionType !== QuestionType.MULTIPLE_CHOICE) {
      return [];
    }
    const shuffled = shuffleArray(currentQuestion.choices);
    return shuffled.map((c, i) => ({
      ...c,
      label: LABELS[i] ?? String(i + 1),
    }));
  }, [currentQuestion]);

  // Initialize sorted choices for sorting questions
  useMemo(() => {
    if (currentQuestion?.questionType === QuestionType.SORTING) {
      setSortedChoices(currentQuestion.choices);
    }
  }, [currentQuestion]);

  const evaluateAnswer = useCallback((): boolean => {
    if (!currentQuestion) return false;

    switch (currentQuestion.questionType) {
      case QuestionType.MULTIPLE_CHOICE: {
        const selected = displayChoices.find((c) => c.id === selectedAnswer);
        return selected?.isCorrect === true;
      }
      case QuestionType.SORTING: {
        return sortedChoices.every(
          (choice, index) => choice.correctOrder === index + 1
        );
      }
      case QuestionType.FILL_IN_BLANK: {
        const correctAnswer = currentQuestion.choices[0]?.text ?? '';
        return (
          (selectedAnswer ?? '').trim().toLowerCase() ===
          correctAnswer.trim().toLowerCase()
        );
      }
      default:
        return false;
    }
  }, [currentQuestion, selectedAnswer, sortedChoices, displayChoices]);

  const canSubmit = (): boolean => {
    if (!currentQuestion || isSubmitted) return false;

    switch (currentQuestion.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return selectedAnswer !== null;
      case QuestionType.SORTING:
        return true; // Can always submit sorting (user may accept default order)
      case QuestionType.FILL_IN_BLANK:
        return (selectedAnswer ?? '').trim().length > 0;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;

    const correct = evaluateAnswer();
    setIsCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      setScore((s) => s + 1);
    }

    updateReviewMetadata(currentQuestion.id, correct);
  };

  const handleNext = () => {
    if (currentIndex >= shuffledQuestions.length - 1) {
      // Finish
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const totalQuestions = shuffledQuestions.length;
      const finalScore = score;

      const session: StudySessionType = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        topic,
        totalQuestions,
        correctAnswers: finalScore,
        accuracy: totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0,
        duration,
      };

      onComplete(session);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setSortedChoices([]);
    setIsSubmitted(false);
    setIsCorrect(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitted && canSubmit()) {
      handleSubmit();
    }
  };

  if (!currentQuestion) return null;

  const progress = ((currentIndex + (isSubmitted ? 1 : 0)) / shuffledQuestions.length) * 100;
  const isLastQuestion = currentIndex >= shuffledQuestions.length - 1;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium">
            Question {currentIndex + 1} of {shuffledQuestions.length}
          </span>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {score} correct
            </Badge>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion.text}
            </CardTitle>
            <Badge variant="outline" className="shrink-0 capitalize">
              {currentQuestion.difficulty}
            </Badge>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">
            {currentQuestion.category}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Multiple Choice */}
          {currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE && (
            <RadioGroup
              value={selectedAnswer ?? ''}
              onValueChange={(val) => {
                if (!isSubmitted) setSelectedAnswer(val);
              }}
              className="space-y-3"
            >
              {displayChoices.map((choice) => {
                const isSelected = selectedAnswer === choice.id;
                const showFeedback = isSubmitted;
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
                      isSubmitted && 'cursor-default'
                    )}
                  >
                    <RadioGroupItem
                      value={choice.id}
                      disabled={isSubmitted}
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
          {currentQuestion.questionType === QuestionType.SORTING && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Drag and drop items into the correct order.
              </p>
              <SortableList
                choices={sortedChoices}
                onOrderChange={(newOrder) => setSortedChoices(newOrder)}
                disabled={isSubmitted}
              />
              {isSubmitted && (
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
          {currentQuestion.questionType === QuestionType.FILL_IN_BLANK && (
            <div className="space-y-4" onKeyDown={handleKeyDown}>
              <div className="space-y-2">
                <Label htmlFor="fill-answer">Your Answer</Label>
                <Input
                  id="fill-answer"
                  type="text"
                  value={selectedAnswer ?? ''}
                  onChange={(e) => {
                    if (!isSubmitted) setSelectedAnswer(e.target.value);
                  }}
                  placeholder="Type your answer here..."
                  disabled={isSubmitted}
                  className={cn(
                    'text-lg',
                    isSubmitted && isCorrect && 'border-emerald-500',
                    isSubmitted && !isCorrect && 'border-red-500'
                  )}
                  autoComplete="off"
                />
              </div>
              {isSubmitted && (
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
                          {currentQuestion.choices[0]?.text}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {isSubmitted && currentQuestion.explanation && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="mb-1 font-semibold">Explanation</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit / Next / Finish buttons */}
          <div className="flex justify-end gap-3 pt-2">
            {!isSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                size="lg"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} size="lg">
                {isLastQuestion ? 'Finish' : 'Next Question'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
