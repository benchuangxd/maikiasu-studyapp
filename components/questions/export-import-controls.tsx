'use client';

import { useState, useRef, useCallback } from 'react';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { downloadExport, importBackupData, type ImportResult } from '@/lib/utils/export-import';

interface ExportImportControlsProps {
  onImportComplete: () => void;
}

export function ExportImportControls({ onImportComplete }: ExportImportControlsProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    try {
      downloadExport();
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportResult(null);
      setError(null);

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const result = importBackupData(ev.target?.result as string);
          setImportResult(result);
          onImportComplete();
        } catch (err) {
          setError(
            `Import failed: ${err instanceof Error ? err.message : 'Invalid backup file'}`,
          );
        }
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsText(file);

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [onImportComplete],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleExport}>
          <Download className="size-4" />
          Export Backup
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" />
          Import Backup
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {importResult && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Backup Restored</AlertTitle>
          <AlertDescription>
            <div className="mt-1 space-y-1">
              <p>
                {importResult.questionsImported} questions imported, {importResult.questionsSkipped}{' '}
                skipped
              </p>
              {importResult.metadataMerged > 0 && (
                <p>{importResult.metadataMerged} review records merged</p>
              )}
              {importResult.sessionsMerged > 0 && (
                <p>{importResult.sessionsMerged} sessions merged</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
