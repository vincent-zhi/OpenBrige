export type OutputStatus =
  | 'waiting_input'
  | 'thinking'
  | 'running_command'
  | 'test_started'
  | 'test_failed'
  | 'test_passed'
  | 'build_failed'
  | 'file_edited'
  | 'question_detected'
  | 'confirmation_prompt'
  | 'task_done'
  | 'error_detected'
  | 'idle';

export interface ClassificationResult {
  status: OutputStatus;
  confidence: number;
  matchedPattern?: string;
  cardKind?: string;
  cardTitle?: string;
  cardSummary?: string;
  cardSeverity?: 'info' | 'success' | 'warning' | 'error';
}
