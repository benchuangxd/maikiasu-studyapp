'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { QuestionChoice } from '@/types/question';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  choice: QuestionChoice;
  index: number;
  disabled: boolean;
}

function SortableItem({ choice, index, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: choice.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border-2 p-4 transition-colors',
        isDragging
          ? 'z-50 border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : disabled
            ? 'border-border bg-muted/30 text-muted-foreground'
            : 'cursor-move border-border bg-card hover:border-primary/50'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex shrink-0 items-center gap-2">
        <GripVertical
          className={cn(
            'h-5 w-5',
            disabled ? 'text-muted-foreground/50' : 'text-primary'
          )}
        />
        <span className="text-lg font-bold text-primary">{index + 1}.</span>
      </div>
      <div className="flex-1">
        <span className="text-foreground">{choice.text}</span>
      </div>
    </div>
  );
}

interface SortableListProps {
  choices: QuestionChoice[];
  onOrderChange: (newOrder: QuestionChoice[]) => void;
  disabled?: boolean;
}

export function SortableList({
  choices,
  onOrderChange,
  disabled = false,
}: SortableListProps) {
  const [items, setItems] = useState<QuestionChoice[]>(choices);

  useEffect(() => {
    setItems(choices);
  }, [choices]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder);
      onOrderChange(newOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((choice, index) => (
            <SortableItem
              key={choice.id}
              choice={choice}
              index={index}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
