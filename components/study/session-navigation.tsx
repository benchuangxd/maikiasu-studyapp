'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
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
