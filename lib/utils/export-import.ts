import type { Question, ReviewMetadata, StudySession } from '@/types/question';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';

interface ExportData {
  version: '1.0';
  exportDate: string;
  questions: Question[];
  reviewMetadata: Record<string, ReviewMetadata>;
  sessions: StudySession[];
}

export function exportAllData(): string {
  const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
  const reviewStorage = new LocalStorageAdapter<Record<string, ReviewMetadata>>(STORAGE_KEYS.REVIEW_METADATA);
  const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);

  const data: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    questions: questionsStorage.get() ?? [],
    reviewMetadata: reviewStorage.get() ?? {},
    sessions: sessionsStorage.get() ?? [],
  };

  return JSON.stringify(data, null, 2);
}

export function downloadExport(): void {
  const json = exportAllData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maikiasu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  questionsImported: number;
  questionsSkipped: number;
  metadataMerged: number;
  sessionsMerged: number;
}

export function importBackupData(json: string): ImportResult {
  const data: ExportData = JSON.parse(json);
  if (data.version !== '1.0') {
    throw new Error(`Unsupported backup version: ${data.version}`);
  }

  const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
  const reviewStorage = new LocalStorageAdapter<Record<string, ReviewMetadata>>(STORAGE_KEYS.REVIEW_METADATA);
  const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);

  const existing = questionsStorage.get() ?? [];
  const existingTexts = new Set(existing.map((q) => q.text));
  let questionsImported = 0;
  let questionsSkipped = 0;

  for (const q of data.questions) {
    if (existingTexts.has(q.text)) {
      questionsSkipped++;
    } else {
      existing.push(q);
      existingTexts.add(q.text);
      questionsImported++;
    }
  }
  questionsStorage.set(existing);

  const existingMeta = reviewStorage.get() ?? {};
  let metadataMerged = 0;
  for (const [id, meta] of Object.entries(data.reviewMetadata)) {
    const current = existingMeta[id];
    if (!current || (meta.lastReviewed && (!current.lastReviewed || meta.lastReviewed > current.lastReviewed))) {
      existingMeta[id] = meta;
      metadataMerged++;
    }
  }
  reviewStorage.set(existingMeta);

  const existingSessions = sessionsStorage.get() ?? [];
  const existingSessionIds = new Set(existingSessions.map((s) => s.id));
  let sessionsMerged = 0;
  for (const session of data.sessions) {
    if (!existingSessionIds.has(session.id)) {
      existingSessions.push(session);
      sessionsMerged++;
    }
  }
  sessionsStorage.set(existingSessions);

  return { questionsImported, questionsSkipped, metadataMerged, sessionsMerged };
}
