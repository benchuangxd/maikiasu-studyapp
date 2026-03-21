'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import { getReviewStats, getReviewMetadata } from '@/lib/services/review-service';
import type { Question, ReviewMetadata, StudySession } from '@/types/question';
import { cn } from '@/lib/utils';
import { BookOpen, Target, Flame, LayoutGrid } from 'lucide-react';

const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function computeStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;

  // Get unique days (YYYY-MM-DD) that have sessions, sorted descending
  const days = Array.from(
    new Set(sessions.map((s) => s.date.slice(0, 10)))
  ).sort((a, b) => (a > b ? -1 : 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);

  for (const day of days) {
    const checkStr = checkDate.toISOString().slice(0, 10);
    if (day === checkStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (day < checkStr) {
      // Gap found — stop
      break;
    }
    // day > checkStr shouldn't happen since we sorted descending
  }

  return streak;
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
}

function SummaryCard({ title, value, subtitle, icon, accent }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn('rounded-md bg-muted p-2', accent)}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold leading-none">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

interface TopicStat {
  category: string;
  total: number;
  studied: number;
  mastered: number;
  accuracy: number | null;
}

export function StatsDashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setQuestions(questionsStorage.get() ?? []);
    setSessions(sessionsStorage.get() ?? []);
  }, []);

  // --- Summary Card Data ---
  const totalQuestions = questions.length;

  const totalStudied = useMemo(() => {
    if (!mounted) return 0;
    return questions.filter((q) => {
      const meta: ReviewMetadata = getReviewMetadata(q.id);
      return !!meta.lastReviewed;
    }).length;
  }, [questions, mounted]);

  const overallAccuracy = useMemo(() => {
    if (sessions.length === 0) return null;
    const avg = sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;
    return Math.round(avg);
  }, [sessions]);

  const studyStreak = useMemo(() => computeStreak(sessions), [sessions]);

  // --- Review State Distribution ---
  const reviewStats = useMemo(() => {
    if (!mounted || questions.length === 0) return null;
    return getReviewStats(questions);
  }, [questions, mounted]);

  // --- Topic Breakdown ---
  const topicStats = useMemo((): TopicStat[] => {
    const categories = Array.from(new Set(questions.map((q) => q.category))).sort();

    return categories.map((category) => {
      const catQuestions = questions.filter((q) => q.category === category);
      const total = catQuestions.length;

      let studied = 0;
      let mastered = 0;

      if (mounted) {
        for (const q of catQuestions) {
          const meta: ReviewMetadata = getReviewMetadata(q.id);
          if (meta.lastReviewed) studied++;
          if (meta.repetitions >= 3) mastered++;
        }
      }

      // Compute accuracy from sessions that match this category
      const catSessions = sessions.filter((s) => s.topic === category);
      let accuracy: number | null = null;
      if (catSessions.length > 0) {
        accuracy = Math.round(
          catSessions.reduce((sum, s) => sum + s.accuracy, 0) / catSessions.length
        );
      }

      return { category, total, studied, mastered, accuracy };
    });
  }, [questions, sessions, mounted]);

  // --- Recent Sessions ---
  const recentSessions = useMemo(() => sessions.slice(0, 10), [sessions]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Questions"
          value={totalQuestions}
          subtitle="in your library"
          icon={<LayoutGrid className="h-4 w-4" />}
          accent="text-blue-400"
        />
        <SummaryCard
          title="Total Studied"
          value={totalStudied}
          subtitle={totalQuestions > 0 ? `${Math.round((totalStudied / totalQuestions) * 100)}% of library` : 'no questions yet'}
          icon={<BookOpen className="h-4 w-4" />}
          accent="text-emerald-400"
        />
        <SummaryCard
          title="Overall Accuracy"
          value={overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
          subtitle={sessions.length > 0 ? `across ${sessions.length} session${sessions.length !== 1 ? 's' : ''}` : 'no sessions yet'}
          icon={<Target className="h-4 w-4" />}
          accent="text-amber-400"
        />
        <SummaryCard
          title="Study Streak"
          value={studyStreak > 0 ? `${studyStreak}d` : '—'}
          subtitle={studyStreak > 0 ? `${studyStreak} consecutive day${studyStreak !== 1 ? 's' : ''}` : 'study today to start a streak'}
          icon={<Flame className="h-4 w-4" />}
          accent={studyStreak > 0 ? 'text-orange-400' : 'text-muted-foreground'}
        />
      </div>

      {/* Review State Distribution */}
      {reviewStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review State Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stacked bar */}
            {reviewStats.total > 0 && (
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {reviewStats.new > 0 && (
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(reviewStats.new / reviewStats.total) * 100}%` }}
                    title={`New: ${reviewStats.new}`}
                  />
                )}
                {reviewStats.learning > 0 && (
                  <div
                    className="bg-orange-500 transition-all"
                    style={{ width: `${(reviewStats.learning / reviewStats.total) * 100}%` }}
                    title={`Learning: ${reviewStats.learning}`}
                  />
                )}
                {reviewStats.review > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(reviewStats.review / reviewStats.total) * 100}%` }}
                    title={`Review: ${reviewStats.review}`}
                  />
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">
                  New <span className="font-semibold text-foreground">{reviewStats.new}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm text-muted-foreground">
                  Learning <span className="font-semibold text-foreground">{reviewStats.learning}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  Review <span className="font-semibold text-foreground">{reviewStats.review}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">
                  Due <span className="font-semibold text-foreground">{reviewStats.due}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topic Breakdown */}
      {topicStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topic Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topicStats.map((topic) => {
                const studiedPct = topic.total > 0
                  ? Math.round((topic.studied / topic.total) * 100)
                  : 0;
                return (
                  <div key={topic.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{topic.category}</span>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {topic.total} Q
                          </Badge>
                          {topic.mastered > 0 && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-400"
                            >
                              {topic.mastered} mastered
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {topic.accuracy !== null && (
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              topic.accuracy >= 80
                                ? 'text-emerald-400'
                                : topic.accuracy >= 60
                                ? 'text-amber-400'
                                : 'text-red-400'
                            )}
                          >
                            {topic.accuracy}%
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {topic.studied}/{topic.total}
                        </span>
                      </div>
                    </div>
                    <Progress value={studiedPct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No study sessions yet. Start studying to see your progress here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Topic</th>
                    <th className="pb-2 text-right font-medium">Score</th>
                    <th className="pb-2 text-right font-medium">Accuracy</th>
                    <th className="pb-2 text-right font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {formatDate(session.date)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="max-w-[160px] truncate block">{session.topic}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {session.correctAnswers}/{session.totalQuestions}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            session.accuracy >= 80
                              ? 'text-emerald-400'
                              : session.accuracy >= 60
                              ? 'text-amber-400'
                              : 'text-red-400'
                          )}
                        >
                          {session.accuracy}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatDuration(session.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
