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
