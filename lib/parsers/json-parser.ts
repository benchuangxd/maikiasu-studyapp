import type {
  Question,
  QuestionChoice,
  RawQuestionFile,
  RawQuestion,
} from '@/types/question';
import { QuestionType, Difficulty } from '@/types/question';

export interface ParseResult {
  questions: Question[];
  topicCount: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

function generateLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

function parseMultipleChoice(
  raw: RawQuestion,
  category: string,
  now: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (raw.correct === undefined || raw.correct < 0 || raw.correct >= raw.options.length) return null;

  const labels = generateLabels(raw.options.length);
  const choices: QuestionChoice[] = raw.options.map((text, i) => ({
    id: crypto.randomUUID(),
    label: labels[i],
    text,
    isCorrect: i === raw.correct,
  }));

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.MULTIPLE_CHOICE,
    choices,
    explanation: raw.rationale || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
  };
}

function parseSorting(
  raw: RawQuestion,
  category: string,
  now: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (!raw.correctOrder || raw.correctOrder.length !== raw.options.length) return null;

  const choices: QuestionChoice[] = raw.options.map((text, i) => ({
    id: crypto.randomUUID(),
    label: String(i + 1),
    text,
    isCorrect: true,
    correctOrder: raw.correctOrder![i],
  }));

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.SORTING,
    choices,
    explanation: raw.rationale || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
  };
}

function parseFillInBlank(
  raw: RawQuestion,
  category: string,
  now: string,
): Question | null {
  if (!raw.answer) return null;

  const choices: QuestionChoice[] = [{
    id: crypto.randomUUID(),
    label: 'A',
    text: raw.answer,
    isCorrect: true,
  }];

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.FILL_IN_BLANK,
    choices,
    explanation: raw.rationale || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseQuestionsFromJSON(
  data: RawQuestionFile,
  existingQuestions: Question[] = [],
): ParseResult {
  const errors: string[] = [];
  const questions: Question[] = [];
  const existingTexts = new Set(existingQuestions.map((q) => q.text));
  const now = new Date().toISOString();
  let skippedCount = 0;

  if (!data.topics || typeof data.topics !== 'object') {
    return { questions: [], topicCount: 0, importedCount: 0, skippedCount: 0, errors: ['Invalid JSON: missing "topics" object at root'] };
  }

  const topicKeys = Object.keys(data.topics);

  for (const topicKey of topicKeys) {
    const topic = data.topics[topicKey];
    if (!topic.questions || !Array.isArray(topic.questions)) {
      errors.push(`Topic "${topic.name || topicKey}": missing questions array`);
      continue;
    }

    for (const raw of topic.questions) {
      if (!raw.question) {
        errors.push(`Topic "${topic.name}", question ${raw.id}: missing question text`);
        skippedCount++;
        continue;
      }

      if (existingTexts.has(raw.question)) {
        skippedCount++;
        continue;
      }

      let parsed: Question | null = null;

      if (raw.type === 'sorting') {
        parsed = parseSorting(raw, topic.name, now);
      } else if (raw.type === 'fill_in_blank') {
        parsed = parseFillInBlank(raw, topic.name, now);
      } else {
        parsed = parseMultipleChoice(raw, topic.name, now);
      }

      if (parsed) {
        questions.push(parsed);
        existingTexts.add(raw.question);
      } else {
        errors.push(`Topic "${topic.name}", question ${raw.id}: invalid structure for type "${raw.type || 'multiple_choice'}"`);
        skippedCount++;
      }
    }
  }

  return {
    questions,
    topicCount: topicKeys.length,
    importedCount: questions.length,
    skippedCount,
    errors,
  };
}
