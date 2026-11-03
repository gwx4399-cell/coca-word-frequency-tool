import type { TeachingNote } from './teaching';

export type EssayMetadata = {
  learnerId?: string;
  taskId?: string;
  genre?: string;
  draftKind?: 'original' | 'revision' | 'independent';
  revisionOf?: string;
};

export type EssayRecord = EssayMetadata & {
  id: string;
  title: string;
  writtenAt: string;
  taskPrompt?: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  notes?: TeachingNote[];
};

export type CreateEssayInput = Pick<EssayRecord, 'title' | 'writtenAt' | 'taskPrompt' | 'text'> & EssayMetadata;

export type EssayValidationErrors = Partial<Record<'title' | 'writtenAt' | 'text', string>>;
