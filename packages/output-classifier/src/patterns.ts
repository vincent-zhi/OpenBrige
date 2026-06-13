import type { OutputStatus, ClassificationResult } from '@openbrige/shared-types';

export interface PatternDef {
  status: OutputStatus;
  regex: RegExp;
  confidence: number;
  cardKind?: string;
  cardTitle?: string;
  cardSummary?: string;
  cardSeverity?: ClassificationResult['cardSeverity'];
}

export const BUILTIN_PATTERNS: PatternDef[] = [
  {
    status: 'thinking',
    regex: /(?:^|\n)\s*(?:thinking|analyzing|processing|let me think|considering|pondering|evaluating|reflecting on|working through|figuring out)\b/im,
    confidence: 0.8,
    cardKind: 'checkpoint',
    cardTitle: 'Agent Thinking',
    cardSummary: 'The agent is processing or analyzing',
    cardSeverity: 'info',
  },
  {
    status: 'running_command',
    regex: /(?:^|\n)\s*(?:\$\s+[^\s]|>\s+[^\s]|running\s+(?:command|script|task)|executing\s+(?:command|script)|sh\s+-c\s|bash\s+-c\s|npm\s+(?:run|exec|start|test)|npx\s|pnpm\s|yarn\s|cargo\s+(?:run|build|test)|python\s|go\s+(?:run|test|build))/im,
    confidence: 0.75,
    cardKind: 'command',
    cardTitle: 'Command Running',
    cardSummary: 'A command is being executed',
    cardSeverity: 'info',
  },
  {
    status: 'waiting_input',
    regex: /(?:^|\n)\s*(?:waiting for (?:user )?input|input (?:required|needed)|(?:enter|type|provide)\s.*[:?]|stdin.*(?:open|waiting)|>\s*$)/im,
    confidence: 0.85,
    cardKind: 'question',
    cardTitle: 'Waiting for Input',
    cardSummary: 'The process is waiting for user input',
    cardSeverity: 'warning',
  },
  {
    status: 'confirmation_prompt',
    regex: /(?:^|\n)\s*(?:\[(?:Y|y)es\/(?:N|n)o\]|(?:do you|are you|confirm|proceed)\s.*\?\s*$|(?:y\/n|Y\/N|yes\/no)\s*[:?]?\s*$|(?:press (?:enter|y|n) to (?:continue|confirm|proceed)))/im,
    confidence: 0.9,
    cardKind: 'question',
    cardTitle: 'Confirmation Required',
    cardSummary: 'A confirmation prompt is waiting for a response',
    cardSeverity: 'warning',
  },
  {
    status: 'test_started',
    regex: /(?:^|\n)\s*(?:(?:running|executing|starting)\s+(?:\d+\s+)?tests?|test suite (?:started|running)|(?:jest|vitest|mocha|pytest|cargo test|go test)\b.*(?:started|running|found\s+\d+))|(?:PASS|FAIL)\s+/im,
    confidence: 0.75,
    cardKind: 'test_result',
    cardTitle: 'Tests Running',
    cardSummary: 'Test suite has started executing',
    cardSeverity: 'info',
  },
  {
    status: 'test_failed',
    regex: /(?:^|\n)\s*(?:(?:\d+\s+(?:test|spec)s?\s+)?failed|(?:FAIL|FAILED|✗|✕|×)\s+|(?:test|spec)s?\s+.*(?:failed|failing|error)|assertion.*(?:failed|error)|(?:expected|received).*(?:differ|mismatch))/im,
    confidence: 0.9,
    cardKind: 'test_result',
    cardTitle: 'Tests Failed',
    cardSummary: 'One or more tests have failed',
    cardSeverity: 'error',
  },
  {
    status: 'test_passed',
    regex: /(?:^|\n)\s*(?:(?:all\s+)?(?:\d+\s+(?:test|spec)s?\s+)?passed|(?:PASS|PASSED|✓|✔|√)\s+|(?:test|spec)s?\s+.*(?:passed|passing)|(?:0\s+(?:failures|errors)))/im,
    confidence: 0.9,
    cardKind: 'test_result',
    cardTitle: 'Tests Passed',
    cardSummary: 'All tests passed successfully',
    cardSeverity: 'success',
  },
  {
    status: 'build_failed',
    regex: /(?:^|\n)\s*(?:build\s+(?:failed|error|failure)|compilation\s+(?:failed|error)|(?:error|ERROR)\s*(?:\[|:).*\b(?:TS\d+|E\d+|cannot|unable|not found|undefined)|failed to (?:compile|build))/im,
    confidence: 0.9,
    cardKind: 'error',
    cardTitle: 'Build Failed',
    cardSummary: 'The build process encountered errors',
    cardSeverity: 'error',
  },
  {
    status: 'error_detected',
    regex: /(?:^|\n)\s*(?:(?:uncaught|unhandled)\s+(?:exception|error|reject)|(?:fatal|critical)\s+(?:error|exception)|segmentation fault|stack trace|traceback|(?:Error|ERR|FATAL)\s*[:]\s*\S|panic\s|crash)/im,
    confidence: 0.85,
    cardKind: 'error',
    cardTitle: 'Error Detected',
    cardSummary: 'An error or exception was detected in the output',
    cardSeverity: 'error',
  },
  {
    status: 'task_done',
    regex: /(?:^|\n)\s*(?:(?:task|operation|job)\s+(?:complete[d]?|finished|done|succeed(?:ed)?)|(?:all\s+)?done[!.]|completed\s+successfully|finished\s+(?:in|at)\s+\d)/im,
    confidence: 0.85,
    cardKind: 'completion',
    cardTitle: 'Task Complete',
    cardSummary: 'The task or operation has completed',
    cardSeverity: 'success',
  },
  {
    status: 'file_edited',
    regex: /(?:^|\n)\s*(?:(?:wrote|written|saved|modified|updated|created|edited|changed)\s+(?:file\s+)?[`"']?[^\s`"']+\.(?:ts|tsx|js|jsx|py|rs|go|java|css|html|json|md|yaml|yml|toml)[`"']?|(?:\+\+\+|---)\s+b\/[^\s]+|(?:file|path)\s+(?:changed|modified|updated)\s*[:]\s*\S)/im,
    confidence: 0.8,
    cardKind: 'file_change',
    cardTitle: 'File Modified',
    cardSummary: 'A file has been created or modified',
    cardSeverity: 'info',
  },
  {
    status: 'question_detected',
    regex: /(?:^|\n)\s*(?:(?:what|which|how|where|when|why|who|can you|could you|would you|should|do you|is there|are there|please (?:specify|clarify|provide|explain|describe))\s.*\?|(?:\?\s*$))/im,
    confidence: 0.7,
    cardKind: 'question',
    cardTitle: 'Question Detected',
    cardSummary: 'The output contains a question',
    cardSeverity: 'info',
  },
];
