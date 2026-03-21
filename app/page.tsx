'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import { getDueQuestions, getReviewStats } from '@/lib/services/review-service';
import type { Question, StudySession } from '@/types/question';
import { cn } from '@/lib/utils';

const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const qs = questionsStorage.get() ?? [];
    const ss = sessionsStorage.get() ?? [];
    setQuestions(qs);
    setSessions(ss);

    if (qs.length > 0) {
      const due = getDueQuestions(qs);
      setDueCount(due.length);
    }

    if (ss.length > 0) {
      const totalCorrect = ss.reduce((acc, s) => acc + s.correctAnswers, 0);
      const totalQuestions = ss.reduce((acc, s) => acc + s.totalQuestions, 0);
      setOverallAccuracy(totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
    }

    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Empty state — no questions imported
  if (questions.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="max-w-lg w-full flex flex-col items-center text-center gap-8">
          {/* Brand mark */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="text-3xl font-bold text-primary">M</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              Welcome to MaiKiasu
            </h1>
            <p className="text-lg text-muted-foreground">
              Quiz-based learning with spaced repetition
            </p>
          </div>

          {/* Onboarding card */}
          <Card className="w-full border border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-left">Getting started</CardTitle>
            </CardHeader>
            <CardContent className="text-left space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold">1</span>
                <p>Import your question bank from the Questions page — supports JSON files with multiple topics.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold">2</span>
                <p>Start a study session. MaiKiasu uses the SM-2 spaced repetition algorithm to schedule reviews.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold">3</span>
                <p>Return daily to review due cards and watch your accuracy climb over time.</p>
              </div>
            </CardContent>
          </Card>

          <Button asChild size="lg" className="w-full max-w-xs">
            <Link href="/questions">Import Questions</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Dashboard — questions exist
  const recentSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 3);

  const stats = getReviewStats(questions);

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">MaiKiasu</h1>
        <p className="text-muted-foreground">Your spaced repetition dashboard</p>
      </div>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-4">
        <Card className={cn(
          'border',
          dueCount > 0
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-border/60 bg-card/80'
        )}>
          <CardContent className="pt-5 pb-4 flex flex-col gap-1">
            <span className={cn(
              'text-3xl font-bold',
              dueCount > 0 ? 'text-destructive' : 'text-foreground'
            )}>
              {dueCount}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Due</span>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="pt-5 pb-4 flex flex-col gap-1">
            <span className="text-3xl font-bold text-foreground">{stats.total}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Cards</span>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="pt-5 pb-4 flex flex-col gap-1">
            <span className="text-3xl font-bold text-foreground">
              {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Accuracy</span>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <div>
        {dueCount > 0 ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/study?mode=due">Review Due Questions ({dueCount})</Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/study">Start Studying</Link>
          </Button>
        )}
      </div>

      {/* Recent activity */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>

        {recentSessions.length === 0 ? (
          <Card className="border border-border/60 bg-card/80">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground">
                Import complete! Start your first study session.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSessions.map((session) => (
              <Card key={session.id} className="border border-border/60 bg-card/80">
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground capitalize truncate">
                      {session.topic === 'mixed' ? 'Mixed Topics' : session.topic}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(session.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={session.accuracy >= 70 ? 'default' : 'destructive'}
                      className="text-xs font-semibold"
                    >
                      {session.accuracy}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {session.correctAnswers}/{session.totalQuestions}
                    </span>
                    {session.duration > 0 && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {formatDuration(session.duration)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
