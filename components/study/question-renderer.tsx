'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableList } from '@/components/study/sortable-list';
import type { Question, QuestionChoice } from '@/types/question';
import { QuestionType } from '@/types/question';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  selectedAnswer: string | null;
  selectedAnswers: string[];
  sortedChoices: QuestionChoice[];
  isSubmitted: boolean;
  isCorrect: boolean;
  isViewOnly: boolean;
  displayChoices: QuestionChoice[];
  matchingAnswers: Record<string, string>;
  onAnswerChange: (value: string) => void;
  onToggleAnswer: (choiceId: string) => void;
  onMatchingChange: (choiceId: string, value: string) => void;
  onSortChange: (choices: QuestionChoice[]) => void;
}

export function QuestionRenderer({
  question,
  selectedAnswer,
  selectedAnswers,
  sortedChoices,
  isSubmitted,
  isCorrect,
  isViewOnly,
  displayChoices,
  matchingAnswers,
  onAnswerChange,
  onToggleAnswer,
  onMatchingChange,
  onSortChange,
}: QuestionRendererProps) {
  const disabled = isSubmitted || isViewOnly;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl leading-relaxed">
            {question.text}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 capitalize">
            {question.difficulty}
          </Badge>
        </div>
        <Badge variant="secondary" className="w-fit text-xs">
          {question.category}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Multiple Choice */}
        {question.questionType === QuestionType.MULTIPLE_CHOICE && (
          <RadioGroup
            value={selectedAnswer ?? ''}
            onValueChange={(val) => {
              if (!disabled) onAnswerChange(val);
            }}
            className="space-y-3"
          >
            {displayChoices.map((choice) => {
              const isSelected = selectedAnswer === choice.id;
              const showFeedback = isSubmitted || isViewOnly;
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
                    disabled && 'cursor-default'
                  )}
                >
                  <RadioGroupItem
                    value={choice.id}
                    disabled={disabled}
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

        {/* Multi-Select */}
        {question.questionType === QuestionType.MULTI_SELECT && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select all correct answers.
            </p>
            {displayChoices.map((choice) => {
              const isSelected = selectedAnswers.includes(choice.id);
              const showFeedback = isSubmitted || isViewOnly;
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
                    disabled && 'cursor-default'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => {
                      if (!disabled) onToggleAnswer(choice.id);
                    }}
                    disabled={disabled}
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
          </div>
        )}

        {/* Matching — dropdown per term, numbered reference list */}
        {question.questionType === QuestionType.MATCHING && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Left: terms with dropdowns */}
              <div className="space-y-3">
                {displayChoices.map((choice) => {
                  const selected = matchingAnswers[choice.id] ?? '';
                  const showFeedback = isSubmitted || isViewOnly;
                  const isCorrectAnswer = selected === String(choice.correctOrder);

                  return (
                    <div key={choice.id} className="space-y-1">
                      <div className={cn(
                        'flex items-center gap-3 rounded-lg border-2 p-3 transition-all',
                        showFeedback && isCorrectAnswer
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : showFeedback && selected && !isCorrectAnswer
                            ? 'border-red-500 bg-red-500/10'
                            : selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                      )}>
                        <Select
                          value={selected}
                          onValueChange={(val) => { if (!disabled) onMatchingChange(choice.id, val); }}
                          disabled={disabled}
                        >
                          <SelectTrigger className="w-20 shrink-0">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent>
                            {(question.matchOptions ?? []).map((opt) => {
                              const num = opt.match(/^(\d+)\./)?.[1] ?? opt;
                              return (
                                <SelectItem key={num} value={num}>
                                  {num}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-sm font-medium">{choice.text}</span>
                        {showFeedback && isCorrectAnswer && (
                          <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                        {showFeedback && selected && !isCorrectAnswer && (
                          <div className="ml-auto flex items-center gap-1">
                            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                            <span className="text-xs text-red-400">→ {choice.correctOrder}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: numbered reference list */}
              <div className="space-y-3">
                {(question.matchOptions ?? []).map((opt) => (
                  <div
                    key={opt}
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm"
                  >
                    <span className="font-semibold text-primary shrink-0">
                      {opt.match(/^(\d+)\./)?.[1]}.
                    </span>
                    <span>{opt.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sorting */}
        {question.questionType === QuestionType.SORTING && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag and drop items into the correct order.
            </p>
            <SortableList
              choices={sortedChoices}
              onOrderChange={(newOrder) => onSortChange(newOrder)}
              disabled={disabled}
            />
            {(isSubmitted || isViewOnly) && (
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
        {question.questionType === QuestionType.FILL_IN_BLANK && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fill-answer">Your Answer</Label>
              <Input
                id="fill-answer"
                type="text"
                value={selectedAnswer ?? ''}
                onChange={(e) => {
                  if (!disabled) onAnswerChange(e.target.value);
                }}
                placeholder="Type your answer here..."
                disabled={disabled}
                className={cn(
                  'text-lg',
                  (isSubmitted || isViewOnly) && isCorrect && 'border-emerald-500',
                  (isSubmitted || isViewOnly) && !isCorrect && 'border-red-500'
                )}
                autoComplete="off"
              />
            </div>
            {(isSubmitted || isViewOnly) && (
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
                        {question.choices[0]?.text}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explanation */}
        {(isSubmitted || isViewOnly) && question.explanation && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="mb-1 font-semibold">Explanation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
