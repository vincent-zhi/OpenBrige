import { nanoid } from 'nanoid';
import type {
  SmartCard,
  SmartCardKind,
  SmartCardSeverity,
  CardAction,
} from '@openbrige/shared-types';

export interface Classification {
  kind: SmartCardKind;
  title?: string;
  summary?: string;
  severity?: SmartCardSeverity;
  actions?: CardAction[];
  passed?: boolean;
  details?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
  fileList?: string[];
  filesCount?: number;
  error?: string;
  question?: string;
  command?: string;
  warning?: string;
}

function baseCard(
  sessionId: string,
  kind: SmartCardKind,
  title: string,
  summary: string,
  severity: SmartCardSeverity,
  actions: CardAction[] = [],
): SmartCard {
  return {
    id: nanoid(),
    sessionId,
    kind,
    title,
    summary,
    severity,
    actions,
    createdAt: new Date().toISOString(),
  };
}

export class SmartCardFactory {
  createTestResult(sessionId: string, passed: boolean, details: string): SmartCard {
    return baseCard(
      sessionId,
      'test_result',
      passed ? 'Tests Passed' : 'Tests Failed',
      details,
      passed ? 'success' : 'error',
      [
        { label: 'View Output', type: 'open_output' },
        ...(passed
          ? []
          : [{ label: 'Fix Failures', type: 'send_prompt' as const, text: 'Fix the failing tests' }]),
      ],
    );
  }

  createFileChange(
    sessionId: string,
    filesChanged: number,
    insertions: number,
    deletions: number,
    fileList: string[],
  ): SmartCard {
    const lines = [`+${insertions} / -${deletions} across ${filesChanged} file${filesChanged === 1 ? '' : 's'}`];
    if (fileList.length > 0) {
      for (const f of fileList.slice(0, 5)) {
        lines.push(`  ${f}`);
      }
      if (fileList.length > 5) {
        lines.push(`  ... and ${fileList.length - 5} more`);
      }
    }
    return baseCard(
      sessionId,
      'file_change',
      'Files Changed',
      lines.join('\n'),
      'info',
      [
        { label: 'View Files', type: 'open_files' },
        { label: 'View Diff', type: 'open_diff' },
      ],
    );
  }

  createDiffSummary(sessionId: string, summary: string, filesCount: number): SmartCard {
    return baseCard(
      sessionId,
      'diff_summary',
      'Diff Summary',
      `${filesCount} file${filesCount === 1 ? '' : 's'} changed\n${summary}`,
      'info',
      [{ label: 'View Diff', type: 'open_diff' }],
    );
  }

  createError(sessionId: string, error: string): SmartCard {
    return baseCard(
      sessionId,
      'error',
      'Error',
      error,
      'error',
      [{ label: 'Debug This', type: 'send_prompt', text: `Debug this error: ${error}` }],
    );
  }

  createQuestion(sessionId: string, question: string): SmartCard {
    return baseCard(
      sessionId,
      'question',
      'Question',
      question,
      'info',
      [{ label: 'Answer', type: 'send_prompt' }],
    );
  }

  createCompletion(sessionId: string, summary: string): SmartCard {
    return baseCard(
      sessionId,
      'completion',
      'Task Complete',
      summary,
      'success',
      [{ label: 'Continue', type: 'send_prompt', text: 'Continue' }],
    );
  }

  createWarning(sessionId: string, warning: string): SmartCard {
    return baseCard(
      sessionId,
      'warning',
      'Warning',
      warning,
      'warning',
      [{ label: 'Review', type: 'send_prompt', text: `Review this warning: ${warning}` }],
    );
  }

  createCommand(sessionId: string, command: string): SmartCard {
    return baseCard(
      sessionId,
      'command',
      'Command',
      command,
      'info',
      [{ label: 'Run Again', type: 'bridge_command', command }],
    );
  }

  createFromClassification(sessionId: string, classification: Classification): SmartCard | null {
    switch (classification.kind) {
      case 'test_result':
        return this.createTestResult(
          sessionId,
          classification.passed ?? false,
          classification.details ?? '',
        );
      case 'file_change':
        return this.createFileChange(
          sessionId,
          classification.filesChanged ?? 0,
          classification.insertions ?? 0,
          classification.deletions ?? 0,
          classification.fileList ?? [],
        );
      case 'diff_summary':
        return this.createDiffSummary(
          sessionId,
          classification.summary ?? '',
          classification.filesCount ?? 0,
        );
      case 'error':
        return this.createError(sessionId, classification.error ?? 'Unknown error');
      case 'question':
        return this.createQuestion(sessionId, classification.question ?? '');
      case 'completion':
        return this.createCompletion(sessionId, classification.summary ?? '');
      case 'warning':
        return this.createWarning(sessionId, classification.warning ?? '');
      case 'command':
        return this.createCommand(sessionId, classification.command ?? '');
      case 'checkpoint':
        return baseCard(
          sessionId,
          'checkpoint',
          classification.title ?? 'Checkpoint',
          classification.summary ?? '',
          classification.severity ?? 'info',
          classification.actions ?? [],
        );
      default:
        return null;
    }
  }
}
