import type { OutputStatus, ClassificationResult } from '@openbrige/shared-types';
import { BUILTIN_PATTERNS, type PatternDef } from './patterns';

const WINDOW_SIZE = 4096;

interface ProfilePatternInput {
  status: string;
  pattern: string | RegExp;
  confidence?: number;
  cardKind?: string;
  cardTitle?: string;
  cardSummary?: string;
}

export class OutputClassifier {
  private profilePatterns: PatternDef[] = [];
  private buffer: string = '';

  constructor(profilePatterns?: PatternDef[]) {
    if (profilePatterns) {
      this.profilePatterns = profilePatterns;
    }
  }

  setProfilePatterns(patterns: ProfilePatternInput[] | Record<string, string[]>): void {
    let converted: PatternDef[] = [];

    if (Array.isArray(patterns)) {
      converted = patterns.map(p => ({
        status: p.status as OutputStatus,
        regex: typeof p.pattern === 'string' ? new RegExp(p.pattern, 'im') : p.pattern,
        confidence: p.confidence ?? 0.8,
        cardKind: p.cardKind,
        cardTitle: p.cardTitle,
        cardSummary: p.cardSummary,
      }));
    } else {
      // Record<string, string[]> format: { status: [pattern1, pattern2, ...] }
      converted = Object.entries(patterns).flatMap(([status, pats]) =>
        pats.map(pattern => ({
          status: status as OutputStatus,
          regex: new RegExp(pattern, 'im'),
          confidence: 0.8,
        }))
      );
    }

    this.profilePatterns = converted;
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

    // Check profile patterns FIRST (higher priority)
    for (const pattern of this.profilePatterns) {
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

    // Then check built-in patterns
    for (const pattern of BUILTIN_PATTERNS) {
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
