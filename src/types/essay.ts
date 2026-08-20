export type EssayRecord = {
  id: string;
  title: string;
  writtenAt: string;
  taskPrompt?: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEssayInput = Pick<EssayRecord, 'title' | 'writtenAt' | 'taskPrompt' | 'text'>;

export type EssayValidationErrors = Partial<Record<'title' | 'writtenAt' | 'text', string>>;
