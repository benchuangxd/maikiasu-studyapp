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
