import type { ClassificationResult } from '@openbrige/shared-types';
import { BUILTIN_PATTERNS, type PatternDef } from './patterns';

const WINDOW_SIZE = 4096;

export class OutputClassifier {
  private allPatterns: PatternDef[];
  private buffer: string = '';

  constructor(profilePatterns?: PatternDef[]) {
    this.allPatterns = profilePatterns
      ? [...profilePatterns, ...BUILTIN_PATTERNS]
      : [...BUILTIN_PATTERNS];
  }

  classify(output: string): ClassificationResult {
    const window = this.extractWindow(output);
    return this.matchWindow(window);
  }

  classifyChunk(chunk: string): ClassificationResult[] {
    this.buffer += chunk;
    if (this.buffer.length > WINDOW_SIZE) {
      this.buffer = this.buffer.slice(-WINDOW_SIZE);
    }

    const lines = chunk.split('\n');
    const results: ClassificationResult[] = [];

    for (const line of lines) {
      if (line.trim().length === 0) continue;
      const windowTail = this.extractWindow(this.buffer);
      const result = this.matchWindow(windowTail);
      if (result.status !== 'idle') {
        results.push(result);
      }
    }

    if (results.length === 0) {
      const fallback = this.matchWindow(this.buffer);
      results.push(fallback);
    }

    return results;
  }

  reset(): void {
    this.buffer = '';
  }

  private extractWindow(text: string): string {
    if (text.length <= WINDOW_SIZE) return text;
    return text.slice(-WINDOW_SIZE);
  }

  private matchWindow(text: string): ClassificationResult {
    let best: ClassificationResult = {
      status: 'idle',
      confidence: 1.0,
    };

    for (const pattern of this.allPatterns) {
      if (pattern.regex.test(text)) {
        if (pattern.confidence > best.confidence || best.status === 'idle') {
          best = {
            status: pattern.status,
            confidence: pattern.confidence,
            matchedPattern: pattern.regex.source,
            cardKind: pattern.cardKind,
            cardTitle: pattern.cardTitle,
            cardSummary: pattern.cardSummary,
            cardSeverity: pattern.cardSeverity,
          };
        }
      }
    }

    return best;
  }
}
