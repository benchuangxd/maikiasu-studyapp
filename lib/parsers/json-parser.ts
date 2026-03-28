import type {
  Question,
  QuestionChoice,
  RawQuestionFile,
  RawQuestion,
  RawFlatQuestion,
  RawFlatQuestionFile,
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

// --- Legacy format parsers (topics-based) ---

function parseMultipleChoice(
  raw: RawQuestion,
  category: string,
  now: string,
  moduleName?: string,
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
    ...(moduleName ? { module: moduleName } : {}),
  };
}

function parseSorting(
  raw: RawQuestion,
  category: string,
  now: string,
  moduleName?: string,
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
    ...(moduleName ? { module: moduleName } : {}),
  };
}

function parseFillInBlank(
  raw: RawQuestion,
  category: string,
  now: string,
  moduleName?: string,
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
    ...(moduleName ? { module: moduleName } : {}),
  };
}

function parseLegacyFormat(
  data: RawQuestionFile,
  existingTexts: Set<string>,
  now: string,
  moduleName?: string,
): { questions: Question[]; topicCount: number; skippedCount: number; errors: string[] } {
  const errors: string[] = [];
  const questions: Question[] = [];
  let skippedCount = 0;

  if (!data.topics || typeof data.topics !== 'object') {
    return { questions: [], topicCount: 0, skippedCount: 0, errors: ['Invalid JSON: missing "topics" object at root'] };
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
        parsed = parseSorting(raw, topic.name, now, moduleName);
      } else if (raw.type === 'fill_in_blank') {
        parsed = parseFillInBlank(raw, topic.name, now, moduleName);
      } else {
        parsed = parseMultipleChoice(raw, topic.name, now, moduleName);
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

  return { questions, topicCount: topicKeys.length, skippedCount, errors };
}

// --- Flat format parsers (array-based) ---

function parseFlatSingle(
  raw: RawFlatQuestion,
  category: string,
  now: string,
  moduleName?: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (typeof raw.answer !== 'string') return null;

  const answerText = raw.answer;
  const labels = generateLabels(raw.options.length);
  const choices: QuestionChoice[] = raw.options.map((text, i) => ({
    id: crypto.randomUUID(),
    label: labels[i],
    text,
    isCorrect: text === answerText,
  }));

  // Verify at least one correct answer was matched
  if (!choices.some((c) => c.isCorrect)) return null;

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.MULTIPLE_CHOICE,
    choices,
    explanation: raw.note || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
    ...(moduleName ? { module: moduleName } : {}),
  };
}

function parseFlatMultiple(
  raw: RawFlatQuestion,
  category: string,
  now: string,
  moduleName?: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (!Array.isArray(raw.answer)) return null;

  const correctSet = new Set(raw.answer as string[]);
  const labels = generateLabels(raw.options.length);
  const choices: QuestionChoice[] = raw.options.map((text, i) => ({
    id: crypto.randomUUID(),
    label: labels[i],
    text,
    isCorrect: correctSet.has(text),
  }));

  if (!choices.some((c) => c.isCorrect)) return null;

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.MULTI_SELECT,
    choices,
    explanation: raw.note || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
    ...(moduleName ? { module: moduleName } : {}),
  };
}

function parseFlatMatching(
  raw: RawFlatQuestion,
  category: string,
  now: string,
  moduleName?: string,
): Question | null {
  if (!raw.options || raw.options.length === 0) return null;
  if (!raw.answer || typeof raw.answer !== 'object' || Array.isArray(raw.answer)) return null;

  const answerMap = raw.answer as Record<string, string>;
  const answerKeys = Object.keys(answerMap);
  const answerValues = Object.values(answerMap);

  // Format A: answer keys are the option texts, values are position numbers
  //   options: ["Data Abstraction", ...], answer: { "Data Abstraction": "5", ... }
  const isFormatA = answerKeys.some((k) => raw.options.includes(k));

  // Format B: answer keys are terms, values are numbered option strings
  //   options: ["1. description", ...], answer: { "Term": "1. description", ... }
  const isFormatB = !isFormatA && answerValues.some((v) => raw.options.includes(v));

  let choices: QuestionChoice[];

  if (isFormatA) {
    choices = raw.options.map((text) => ({
      id: crypto.randomUUID(),
      label: text,
      text,
      isCorrect: true,
      correctOrder: answerMap[text] !== undefined ? parseInt(answerMap[text], 10) : undefined,
    }));
  } else if (isFormatB) {
    // Format B: terms on the left match to numbered options on the right.
    // choices = terms (answer keys), correctOrder = leading number from the matched option string.
    const termChoices: QuestionChoice[] = answerKeys.map((term) => {
      const matchedOption = answerMap[term]; // e.g. "1. Raspberry Pi"
      const orderMatch = matchedOption?.match(/^(\d+)\./);
      const correctOrder = orderMatch ? parseInt(orderMatch[1], 10) : undefined;
      return {
        id: crypto.randomUUID(),
        label: term,
        text: term,
        isCorrect: true,
        correctOrder,
      };
    });

    if (termChoices.some((c) => c.correctOrder === undefined || isNaN(c.correctOrder!))) return null;

    return {
      id: crypto.randomUUID(),
      text: raw.question,
      questionType: QuestionType.MATCHING,
      choices: termChoices,
      matchOptions: raw.options, // ["1. Raspberry Pi", "2. NVidia Jetson"]
      explanation: raw.note || '',
      category,
      difficulty: Difficulty.MEDIUM,
      createdAt: now,
      updatedAt: now,
      ...(moduleName ? { module: moduleName } : {}),
    };
  } else {
    return null;
  }

  // Verify all choices have a valid correctOrder (Format A only reaches here)
  if (choices.some((c) => c.correctOrder === undefined || isNaN(c.correctOrder!))) return null;

  return {
    id: crypto.randomUUID(),
    text: raw.question,
    questionType: QuestionType.SORTING,
    choices,
    explanation: raw.note || '',
    category,
    difficulty: Difficulty.MEDIUM,
    createdAt: now,
    updatedAt: now,
    ...(moduleName ? { module: moduleName } : {}),
  };
}

function parseFlatFormat(
  data: RawFlatQuestionFile,
  existingTexts: Set<string>,
  now: string,
  moduleName?: string,
): { questions: Question[]; topicCount: number; skippedCount: number; errors: string[] } {
  const errors: string[] = [];
  const questions: Question[] = [];
  const chapters = new Set<string>();
  let skippedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];

    if (!raw.question) {
      errors.push(`Question ${i + 1}: missing question text`);
      skippedCount++;
      continue;
    }

    if (existingTexts.has(raw.question)) {
      skippedCount++;
      continue;
    }

    const category = raw.chapter || 'Uncategorized';
    chapters.add(category);

    let parsed: Question | null = null;

    // Default to 'single' when type is missing (common in hand-authored JSON)
    const qType = raw.type || 'single';

    switch (qType) {
      case 'single':
        parsed = parseFlatSingle(raw, category, now, moduleName);
        break;
      case 'multiple':
        parsed = parseFlatMultiple(raw, category, now, moduleName);
        break;
      case 'matching':
        parsed = parseFlatMatching(raw, category, now, moduleName);
        break;
      default:
        errors.push(`Question ${i + 1}: unknown type "${qType}"`);
        skippedCount++;
        continue;
    }

    if (parsed) {
      questions.push(parsed);
      existingTexts.add(raw.question);
    } else {
      errors.push(`Question ${i + 1} ("${raw.question.slice(0, 50)}…"): invalid structure for type "${raw.type}"`);
      skippedCount++;
    }
  }

  return { questions, topicCount: chapters.size, skippedCount, errors };
}

// --- Public API ---

export function parseQuestionsFromJSON(
  data: unknown,
  existingQuestions: Question[] = [],
  moduleName?: string,
): ParseResult {
  const existingTexts = new Set(existingQuestions.map((q) => q.text));
  const now = new Date().toISOString();

  // Auto-detect format: array = flat, object with topics = legacy
  if (Array.isArray(data)) {
    const { questions, topicCount, skippedCount, errors } = parseFlatFormat(
      data as RawFlatQuestionFile,
      existingTexts,
      now,
      moduleName,
    );
    return { questions, topicCount, importedCount: questions.length, skippedCount, errors };
  }

  if (data && typeof data === 'object' && 'topics' in data) {
    const { questions, topicCount, skippedCount, errors } = parseLegacyFormat(
      data as RawQuestionFile,
      existingTexts,
      now,
      moduleName,
    );
    return { questions, topicCount, importedCount: questions.length, skippedCount, errors };
  }

  return {
    questions: [],
    topicCount: 0,
    importedCount: 0,
    skippedCount: 0,
    errors: ['Invalid JSON: expected an array of questions or an object with a "topics" key'],
  };
}
