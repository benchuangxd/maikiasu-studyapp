import type { Question, ReviewMetadata } from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import {
  calculateSM2,
  getInitialReviewMetadata,
  isDueForReview,
  getQualityRating,
} from '@/lib/algorithms/sm2';

const reviewStorage = new LocalStorageAdapter<Record<string, ReviewMetadata>>(
  STORAGE_KEYS.REVIEW_METADATA
);

export function getReviewMetadata(questionId: string): ReviewMetadata {
  const allMetadata = reviewStorage.get() ?? {};
  const metadata = allMetadata[questionId];

  if (metadata) {
    return metadata;
  }

  const initial = getInitialReviewMetadata();
  return {
    questionId,
    easinessFactor: initial.easeFactor,
    interval: initial.interval,
    repetitions: initial.repetitions,
    nextReviewDate: initial.nextReviewDate,
  };
}

export function updateReviewMetadata(
  questionId: string,
  isCorrect: boolean,
  confidence: 'sure' | 'guessing' = 'sure',
): ReviewMetadata {
  const currentMetadata = getReviewMetadata(questionId);
  const quality = getQualityRating(isCorrect, confidence);

  const result = calculateSM2({
    easeFactor: currentMetadata.easinessFactor,
    interval: currentMetadata.interval,
    repetitions: currentMetadata.repetitions,
    quality,
  });

  const newMetadata: ReviewMetadata = {
    questionId,
    easinessFactor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    nextReviewDate: result.nextReviewDate,
    lastReviewed: new Date().toISOString(),
  };

  const allMetadata = reviewStorage.get() ?? {};
  allMetadata[questionId] = newMetadata;
  reviewStorage.set(allMetadata);

  return newMetadata;
}

export function getDueQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => {
    const metadata = getReviewMetadata(question.id);
    if (!metadata.lastReviewed) return true;
    return isDueForReview(metadata.nextReviewDate);
  });
}

export function getDueQuestionsByTopic(questions: Question[]): Record<string, Question[]> {
  const dueQuestions = getDueQuestions(questions);
  const byTopic: Record<string, Question[]> = {};
  for (const q of dueQuestions) {
    if (!byTopic[q.category]) {
      byTopic[q.category] = [];
    }
    byTopic[q.category].push(q);
  }
  return byTopic;
}

export function getNewQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => {
    const metadata = getReviewMetadata(question.id);
    return !metadata.lastReviewed;
  });
}

export function getReviewStats(questions: Question[]): {
  total: number;
  new: number;
  learning: number;
  review: number;
  due: number;
} {
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let dueCount = 0;

  for (const question of questions) {
    const metadata = getReviewMetadata(question.id);

    if (!metadata.lastReviewed) {
      newCount++;
      dueCount++;
    } else if (metadata.repetitions < 2) {
      learningCount++;
      if (isDueForReview(metadata.nextReviewDate)) {
        dueCount++;
      }
    } else {
      reviewCount++;
      if (isDueForReview(metadata.nextReviewDate)) {
        dueCount++;
      }
    }
  }

  return { total: questions.length, new: newCount, learning: learningCount, review: reviewCount, due: dueCount };
}

export function resetAllReviews(): void {
  reviewStorage.set({});
}
