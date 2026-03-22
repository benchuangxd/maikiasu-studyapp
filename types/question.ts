export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SORTING = 'sorting',
  FILL_IN_BLANK = 'fill_in_blank',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface QuestionChoice {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  correctOrder?: number;
}

export interface Question {
  id: string;
  text: string;
  questionType: QuestionType;
  choices: QuestionChoice[];
  explanation: string;
  category: string;
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewMetadata {
  questionId: string;
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewed?: string;
}

export interface StudySession {
  id: string;
  date: string;
  topic: string | 'mixed';
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  duration: number;
  mode?: 'due' | 'topic' | 'all' | 'new';
  isRetry?: boolean;
  parentSessionId?: string;
}

export interface ActiveSessionAnswer {
  selectedAnswer: number | string | string[];
  // MC: number (choice index), fill-in-blank: string, sorting: string[] (choice IDs in order)
  isCorrect: boolean;
  submittedAt: string;
  confidence: 'sure' | 'guessing';
}

export interface ActiveSession {
  id: string;
  mode: 'due' | 'topic' | 'all' | 'new';
  selectedTopics?: string[];
  questionIds: string[];
  answers: Record<string, ActiveSessionAnswer>;
  currentIndex: number;
  startedAt: string;
  elapsedSeconds: number;
  isRetry: boolean;
  parentSessionId?: string;
}

export interface RawQuestion {
  id: number;
  type?: 'sorting' | 'fill_in_blank';
  question: string;
  options?: string[];
  correct?: number;
  correctOrder?: number[];
  answer?: string;
  rationale: string;
}

export interface RawTopic {
  name: string;
  icon: string;
  questions: RawQuestion[];
}

export interface RawQuestionFile {
  topics: Record<string, RawTopic>;
}
