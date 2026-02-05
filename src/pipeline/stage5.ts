import { PullRequestIntent } from '../types.js';
import { SemanticMatch } from './stage4.js';

export interface DecisionContext {
    sourceIntent: PullRequestIntent;
    matches: SemanticMatch[];
}

export async function stage5Decision(
    context: DecisionContext
): Promise<string> {
    // Simple Mock Logic:
    // If any match has confidence > 0.85, we trigger a comment.

    const bestMatch = context.matches.sort((a, b) => b.finalConfidence - a.finalConfidence)[0];

    if (bestMatch && bestMatch.finalConfidence > 0.85) {
        return `comment_duplicate (PR #${bestMatch.prNumber})`;
    }

    return 'no_action';
}
