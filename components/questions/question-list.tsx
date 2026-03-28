'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, Filter, FileQuestion, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import type { Question } from '@/types/question';
import { QuestionType } from '@/types/question';
import { cn } from '@/lib/utils';

interface QuestionListProps {
  refreshKey: number;
}

const questionTypeLabel: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: 'MCQ',
  [QuestionType.MULTI_SELECT]: 'Multi',
  [QuestionType.SORTING]: 'Sort',
  [QuestionType.MATCHING]: 'Match',
  [QuestionType.FILL_IN_BLANK]: 'Fill-in',
};

const questionTypeColor: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
  [QuestionType.MULTI_SELECT]: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  [QuestionType.SORTING]: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  [QuestionType.MATCHING]: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  [QuestionType.FILL_IN_BLANK]: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
};

export function QuestionList({ refreshKey }: QuestionListProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const storage = useMemo(() => new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS), []);

  useEffect(() => {
    setQuestions(storage.get() ?? []);
  }, [refreshKey, storage]);

  const categories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category));
    return Array.from(cats).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    if (!categoryFilter) return questions;
    return questions.filter((q) => q.category === categoryFilter);
  }, [questions, categoryFilter]);

  const handleDelete = (question: Question) => {
    const updated = questions.filter((q) => q.id !== question.id);
    storage.set(updated);
    setQuestions(updated);
    setDeleteTarget(null);
  };

  const handleClearAll = () => {
    storage.remove();
    setQuestions([]);
    setShowClearAll(false);
    setCategoryFilter(null);
  };

  if (questions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <FileQuestion className="size-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">No questions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a JSON file above to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">{filtered.length}</span> of{' '}
          <span className="font-medium text-foreground">{questions.length}</span> questions
        </p>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="size-4" />
                {categoryFilter ?? 'All Categories'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                <span className={cn(!categoryFilter && 'font-semibold')}>All Categories</span>
              </DropdownMenuItem>
              {categories.map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>
                  <span className={cn(categoryFilter === cat && 'font-semibold')}>{cat}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="destructive" size="sm" onClick={() => setShowClearAll(true)}>
            <Trash2 className="size-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Active filter indicator */}
      {categoryFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1">
            {categoryFilter}
            <button
              onClick={() => setCategoryFilter(null)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Question cards */}
      <div className="grid gap-3">
        {filtered.map((question) => (
          <Card key={question.id} className="py-3 transition-colors hover:bg-accent/30">
            <CardContent className="flex items-start justify-between gap-4 py-0">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm leading-relaxed">
                  {question.text.length > 100
                    ? `${question.text.slice(0, 100)}...`
                    : question.text}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {question.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn('border text-xs', questionTypeColor[question.questionType])}
                  >
                    {questionTypeLabel[question.questionType]}
                  </Badge>
                  <span className="text-xs capitalize text-muted-foreground">
                    {question.difficulty}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteTarget(question)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete single confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="rounded-md bg-muted p-3 text-sm">
              {deleteTarget.text.length > 120
                ? `${deleteTarget.text.slice(0, 120)}...`
                : deleteTarget.text}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear all confirmation */}
      <Dialog open={showClearAll} onOpenChange={setShowClearAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Questions</DialogTitle>
            <DialogDescription>
              This will permanently delete all {questions.length} questions. This action cannot be
              undone. Consider exporting a backup first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearAll(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
