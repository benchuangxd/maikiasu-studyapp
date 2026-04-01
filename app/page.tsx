'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionResumeBanner } from '@/components/study/session-resume-banner';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import { getDueQuestions, getReviewStats } from '@/lib/services/review-service';
import { parseQuestionsFromJSON } from '@/lib/parsers/json-parser';
import { MODULES, type ModuleDefinition } from '@/lib/config/modules';
import type { Question, StudySession, ActiveSession } from '@/types/question';
import { formatDurationHuman, formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, BookOpen } from 'lucide-react';

// Storage adapters
const questionsStorage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
const sessionsStorage = new LocalStorageAdapter<StudySession[]>(STORAGE_KEYS.SESSIONS);
const loadedModulesStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.LOADED_MODULES);
// loaded-modules value: Record<moduleId, loadedAt ISO string>
const moduleVersionsStorage = new LocalStorageAdapter<Record<string, string>>(STORAGE_KEYS.MODULE_VERSIONS);
// module-versions value: Record<moduleId, version string>

type ModuleStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ModuleState {
  status: ModuleStatus;
  questionCount: number;
  categories: number;
  error?: string;
  loadedAt?: string;
}

async function fetchRawModule(mod: ModuleDefinition): Promise<unknown> {
  const res = await fetch(mod.file);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let text = await res.text();
  text = text.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(text);
}

async function fetchAndParseModule(
  mod: ModuleDefinition,
  existingQuestions: Question[],
  forceAll = false,
): Promise<{ imported: Question[]; errors: string[] }> {
  const raw = await fetchRawModule(mod);
  // forceAll=true: skip deduplication so we always get the full set back
  const result = parseQuestionsFromJSON(raw, forceAll ? [] : existingQuestions, mod.id);
  return { imported: result.questions, errors: result.errors };
}

export default function Home() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeStudySession, setActiveStudySession] = useState<ActiveSession | null>(null);

  // Per-module state
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>(() =>
    Object.fromEntries(MODULES.map((m) => [m.id, { status: 'idle', questionCount: 0, categories: 0 }]))
  );

  const updateModuleState = useCallback((id: string, patch: Partial<ModuleState>) => {
    setModuleStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  // Load a module (fetch + parse + merge into storage)
  const loadModule = useCallback(async (mod: ModuleDefinition, reload = false) => {
    updateModuleState(mod.id, { status: 'loading', error: undefined });

    try {
      // Get current questions
      const current = questionsStorage.get() ?? [];

      if (reload) {
        // On reload: fetch the full parsed set (no dedup), then remove any existing
        // copies of those questions from storage (tagged OR untagged legacy copies),
        // and replace them with freshly tagged questions.
        const { imported, errors } = await fetchAndParseModule(mod, [], true);
        const freshTexts = new Set(imported.map((q) => q.text));
        // Strip old copies: tagged with this module OR text-matched legacy untagged questions
        const base = current.filter(
          (q) => q.module !== mod.id && !freshTexts.has(q.text)
        );
        const next = [...base, ...imported];
        questionsStorage.set(next);
        const loadedAt = new Date().toISOString();
        const loadedMods = loadedModulesStorage.get() ?? {};
        loadedModulesStorage.set({ ...loadedMods, [mod.id]: loadedAt });
        const moduleVersions = moduleVersionsStorage.get() ?? {};
        moduleVersionsStorage.set({ ...moduleVersions, [mod.id]: mod.version });
        const modQuestions = next.filter((q) => q.module === mod.id);
        const cats = new Set(modQuestions.map((q) => q.category)).size;
        updateModuleState(mod.id, {
          status: 'loaded',
          questionCount: modQuestions.length,
          categories: cats,
          loadedAt,
          error: errors.length > 0 ? `${errors.length} question(s) skipped` : undefined,
        });
        setQuestions(next);
        setDueCount(getDueQuestions(next).length);
        return;
      }

      const { imported, errors } = await fetchAndParseModule(mod, current);

      const next = [...current, ...imported];
      questionsStorage.set(next);

      // Track loaded state
      const loadedAt = new Date().toISOString();
      const loadedMods = loadedModulesStorage.get() ?? {};
      loadedModulesStorage.set({ ...loadedMods, [mod.id]: loadedAt });
      const moduleVersions = moduleVersionsStorage.get() ?? {};
      moduleVersionsStorage.set({ ...moduleVersions, [mod.id]: mod.version });

      // Count categories for this module's new questions
      const modQuestions = next.filter((q) => q.module === mod.id);
      const cats = new Set(modQuestions.map((q) => q.category)).size;

      updateModuleState(mod.id, {
        status: 'loaded',
        questionCount: modQuestions.length,
        categories: cats,
        loadedAt,
        error: errors.length > 0 ? `${errors.length} question(s) skipped` : undefined,
      });

      // Refresh global question state
      setQuestions(next);
      const due = getDueQuestions(next);
      setDueCount(due.length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateModuleState(mod.id, { status: 'error', error: msg });
    }
  }, [updateModuleState]);

  // Initial load
  useEffect(() => {
    const qs = questionsStorage.get() ?? [];
    const ss = sessionsStorage.get() ?? [];
    const loadedMods = loadedModulesStorage.get() ?? {};

    setQuestions(qs);
    setSessions(ss);

    if (qs.length > 0) {
      setDueCount(getDueQuestions(qs).length);
    }

    if (ss.length > 0) {
      const totalCorrect = ss.reduce((acc, s) => acc + s.correctAnswers, 0);
      const totalQs = ss.reduce((acc, s) => acc + s.totalQuestions, 0);
      setOverallAccuracy(totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0);
    }

    // Active session
    const activeSession = new LocalStorageAdapter<ActiveSession>(STORAGE_KEYS.ACTIVE_SESSION).get();
    if (activeSession) {
      const questionIds = new Set(qs.map((q: Question) => q.id));
      const validIds = activeSession.questionIds.filter((id: string) => questionIds.has(id));
      if (validIds.length > 0) setActiveStudySession(activeSession);
    }

    // Reconcile module states from storage
    const initStates: Record<string, ModuleState> = {};
    for (const mod of MODULES) {
      const modQs = qs.filter((q) => q.module === mod.id);
      if (loadedMods[mod.id] && modQs.length > 0) {
        initStates[mod.id] = {
          status: 'loaded',
          questionCount: modQs.length,
          categories: new Set(modQs.map((q) => q.category)).size,
          loadedAt: loadedMods[mod.id],
        };
      } else {
        initStates[mod.id] = { status: 'idle', questionCount: 0, categories: 0 };
      }
    }
    setModuleStates(initStates);
    setLoaded(true);

    // Auto-import modules that haven't been loaded or have a stale version
    const storedVersions = moduleVersionsStorage.get() ?? {};
    const needsLoad = MODULES.filter((m) => {
      const notLoaded = !loadedMods[m.id] || qs.filter((q) => q.module === m.id).length === 0;
      const staleVersion = !!loadedMods[m.id] && storedVersions[m.id] !== m.version;
      return notLoaded || staleVersion;
    });
    if (needsLoad.length > 0) {
      // Fire sequentially to avoid concurrent writes to localStorage
      (async () => {
        for (const mod of needsLoad) {
          await new Promise<void>((resolve) => {
            // We must access latest storage state each time
            const doLoad = async () => {
              const current = questionsStorage.get() ?? [];
              const lm = loadedModulesStorage.get() ?? {};
              const mv = moduleVersionsStorage.get() ?? {};
              const isStale = !!lm[mod.id] && mv[mod.id] !== mod.version;
              updateModuleState(mod.id, { status: 'loading', error: undefined });
              try {
                let next: Question[];
                let imported: Question[];
                let errors: string[];
                if (isStale) {
                  // Force reload: strip old copies and replace with fresh questions
                  ({ imported, errors } = await fetchAndParseModule(mod, [], true));
                  const freshTexts = new Set(imported.map((q) => q.text));
                  const base = current.filter((q) => q.module !== mod.id && !freshTexts.has(q.text));
                  next = [...base, ...imported];
                } else {
                  // First-time load: deduplicate against existing questions
                  ({ imported, errors } = await fetchAndParseModule(mod, current));
                  next = [...current, ...imported];
                }
                questionsStorage.set(next);
                const loadedAt = new Date().toISOString();
                loadedModulesStorage.set({ ...lm, [mod.id]: loadedAt });
                moduleVersionsStorage.set({ ...mv, [mod.id]: mod.version });
                const modQs = next.filter((q) => q.module === mod.id);
                const cats = new Set(modQs.map((q) => q.category)).size;
                updateModuleState(mod.id, {
                  status: 'loaded',
                  questionCount: modQs.length,
                  categories: cats,
                  loadedAt,
                  error: errors.length > 0 ? `${errors.length} question(s) skipped` : undefined,
                });
                setQuestions(next);
                setDueCount(getDueQuestions(next).length);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                updateModuleState(mod.id, { status: 'error', error: msg });
              }
              resolve();
            };
            doLoad();
          });
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const stats = getReviewStats(questions);
  const ss = sessionsStorage.get() ?? [];
  const totalCorrect = ss.reduce((acc, s) => acc + s.correctAnswers, 0);
  const totalQs = ss.reduce((acc, s) => acc + s.totalQuestions, 0);
  const accuracy = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : null;

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">MaiKiasu</h1>
        <p className="text-muted-foreground">Your spaced repetition dashboard</p>
      </div>

      {/* Resume banner */}
      {activeStudySession && (
        <SessionResumeBanner
          session={activeStudySession}
          onResume={() => router.push('/study')}
          onStartFresh={() => {
            new LocalStorageAdapter<ActiveSession>(STORAGE_KEYS.ACTIVE_SESSION).remove();
            setActiveStudySession(null);
          }}
        />
      )}

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-4">
        <Card className={cn(
          'border',
          dueCount > 0
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-border/60 bg-card/80'
        )}>
          <CardContent className="pt-5 pb-4 flex flex-col gap-1">
            <span className={cn(
              'text-3xl font-bold',
              dueCount > 0 ? 'text-destructive' : 'text-foreground'
            )}>
              {dueCount}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Due</span>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="pt-5 pb-4 flex flex-col gap-1">
            <span className="text-3xl font-bold text-foreground">{stats.total}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Cards</span>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="pt-5 pb-4 flex flex-col gap-1">
            <span className="text-3xl font-bold text-foreground">
              {accuracy !== null ? `${accuracy}%` : overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Accuracy</span>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <div>
        {dueCount > 0 ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/study?mode=due">Review Due Questions ({dueCount})</Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/study">Start Studying</Link>
          </Button>
        )}
      </div>

      {/* Modules */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((mod) => {
            const state = moduleStates[mod.id];
            return (
              <Card
                key={mod.id}
                className={cn(
                  'border transition-colors',
                  state.status === 'loaded' && 'border-border/60 bg-card/80',
                  state.status === 'loading' && 'border-primary/30 bg-primary/5',
                  state.status === 'error' && 'border-destructive/40 bg-destructive/5',
                  state.status === 'idle' && 'border-dashed border-border/50',
                )}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-snug">
                      {mod.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground -mt-0.5"
                      disabled={state.status === 'loading'}
                      onClick={() => loadModule(mod, state.status === 'loaded')}
                      title={state.status === 'loaded' ? 'Reload module' : 'Load module'}
                    >
                      {state.status === 'loading' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {state.status === 'loaded' && (
                      <>
                        <div className="flex items-center gap-1 text-xs text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Loaded</span>
                        </div>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          <BookOpen className="h-2.5 w-2.5 mr-1" />
                          {state.questionCount} questions
                        </Badge>
                        {state.categories > 0 && (
                          <Badge variant="outline" className="text-xs h-5 px-1.5">
                            {state.categories} {state.categories === 1 ? 'topic' : 'topics'}
                          </Badge>
                        )}
                        {state.error && (
                          <span className="text-xs text-yellow-500">{state.error}</span>
                        )}
                      </>
                    )}
                    {state.status === 'loading' && (
                      <span className="text-xs text-muted-foreground">Importing…</span>
                    )}
                    {state.status === 'error' && (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{state.error ?? 'Failed to load'}</span>
                      </div>
                    )}
                    {state.status === 'idle' && (
                      <span className="text-xs text-muted-foreground">Not loaded</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>

        {recentSessions.length === 0 ? (
          <Card className="border border-border/60 bg-card/80">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground">
                No sessions yet. Start your first study session!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSessions.map((session) => (
              <Card key={session.id} className="border border-border/60 bg-card/80">
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground capitalize truncate">
                      {session.topic === 'mixed' ? 'Mixed Topics' : session.topic}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(session.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={session.accuracy >= 70 ? 'default' : 'destructive'}
                      className="text-xs font-semibold"
                    >
                      {session.accuracy}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {session.correctAnswers}/{session.totalQuestions}
                    </span>
                    {session.duration > 0 && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {formatDurationHuman(session.duration)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
