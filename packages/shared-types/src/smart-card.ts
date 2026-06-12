export type SmartCardKind =
  | 'question'
  | 'test_result'
  | 'file_change'
  | 'diff_summary'
  | 'error'
  | 'command'
  | 'completion'
  | 'warning'
  | 'checkpoint';

export type SmartCardSeverity = 'info' | 'success' | 'warning' | 'error';

export type CardActionType =
  | 'send_prompt'
  | 'open_output'
  | 'open_diff'
  | 'open_files'
  | 'bridge_command';

export interface CardAction {
  label: string;
  type: CardActionType;
  text?: string;
  command?: string;
}

export interface SmartCard {
  id: string;
  sessionId: string;
  kind: SmartCardKind;
  title: string;
  summary: string;
  severity: SmartCardSeverity;
  actions: CardAction[];
  createdAt: string;
}
