'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileJson, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { parseQuestionsFromJSON, type ParseResult } from '@/lib/parsers/json-parser';
import { LocalStorageAdapter, STORAGE_KEYS } from '@/lib/storage/local-storage';
import type { Question } from '@/types/question';
import { cn } from '@/lib/utils';

interface QuestionImportProps {
  onImportComplete: () => void;
}

export function QuestionImport({ onImportComplete }: QuestionImportProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageFull, setStorageFull] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setResult(null);
      setError(null);
      setStorageFull(false);

      if (!file.name.endsWith('.json')) {
        setError('Please select a .json file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Strip trailing commas before ] or } to tolerate common JSON errors
          const jsonText = (e.target?.result as string).replace(/,\s*([}\]])/g, '$1');
          const raw: unknown = JSON.parse(jsonText);
          const storage = new LocalStorageAdapter<Question[]>(STORAGE_KEYS.QUESTIONS);
          const existing = storage.get() ?? [];
          const parsed = parseQuestionsFromJSON(raw, existing);

          if (parsed.importedCount > 0) {
            const merged = [...existing, ...parsed.questions];
            const success = storage.set(merged);
            if (!success) {
              setStorageFull(true);
              return;
            }
          }

          setResult(parsed);
          onImportComplete();
        } catch (err) {
          setError(
            err instanceof SyntaxError
              ? 'Invalid JSON file. Please check the file format.'
              : `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsText(file);
    },
    [onImportComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFile],
  );

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'cursor-pointer border-2 border-dashed transition-colors duration-200',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div
            className={cn(
              'mb-4 rounded-full p-3 transition-colors',
              isDragOver ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {isDragOver ? <FileJson className="size-8" /> : <Upload className="size-8" />}
          </div>
          <p className="text-sm font-medium text-foreground">
            {isDragOver ? 'Drop your JSON file here' : 'Drag & drop a questions JSON file'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="outline" size="sm" className="mt-4" onClick={(e) => e.stopPropagation()}>
            <FileJson className="size-4" />
            Browse Files
          </Button>
        </CardContent>
      </Card>

      {storageFull && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Storage Full</AlertTitle>
          <AlertDescription>
            Storage full. Export your data and clear old questions.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Import Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Import Complete</AlertTitle>
          <AlertDescription>
            <div className="mt-1 space-y-1">
              <p>
                Imported <span className="font-semibold">{result.importedCount}</span> questions
                from <span className="font-semibold">{result.topicCount}</span>{' '}
                {result.topicCount === 1 ? 'topic' : 'topics'}
              </p>
              {result.skippedCount > 0 && (
                <p className="text-muted-foreground">
                  {result.skippedCount} skipped (duplicates)
                </p>
              )}
              {result.errors.length > 0 && (
                <p className="text-destructive">{result.errors.length} errors encountered</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
