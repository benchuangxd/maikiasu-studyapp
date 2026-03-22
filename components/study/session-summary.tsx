'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Question, ActiveSessionAnswer } from '@/types/question';
import { formatDuration } from '@/lib/utils/format';

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
