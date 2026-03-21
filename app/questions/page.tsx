'use client';

import { useState } from 'react';
import { QuestionImport } from '@/components/questions/question-import';
import { QuestionList } from '@/components/questions/question-list';
import { ExportImportControls } from '@/components/questions/export-import-controls';

export default function QuestionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Questions</h1>
      <QuestionImport onImportComplete={handleRefresh} />
      <ExportImportControls onImportComplete={handleRefresh} />
      <QuestionList refreshKey={refreshKey} />
    </div>
  );
}
