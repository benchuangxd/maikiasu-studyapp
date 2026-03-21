export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export interface SM2Input {
  easeFactor: number;
  interval: number;
  repetitions: number;
  quality: number;
}

export function calculateSM2({ easeFactor, interval, repetitions, quality }: SM2Input): SM2Result {
  const q = Math.max(0, Math.min(5, quality));

  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (q >= 3) {
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

export function getQualityRating(isCorrect: boolean): number {
  return isCorrect ? 4 : 0;
}

export function isDueForReview(nextReviewDate: string, currentDate: Date = new Date()): boolean {
  return currentDate >= new Date(nextReviewDate);
}

export function getInitialReviewMetadata(): SM2Result {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
  };
}
