import { PullRequestIntent } from '../types.js';
import { SemanticMatch } from './stage4.js';
import { feedbackService } from '../services/feedback.js';

export interface DecisionContext {
    sourceIntent: PullRequestIntent;
    matches: SemanticMatch[];
}

export async function stage5Decision(
    context: DecisionContext,
    repoFullName: string
): Promise<string> {
    // 1. Calculate Dynamic Threshold based on Feedback
    const stats = await feedbackService.getFeedbackStats(repoFullName);
    const total = stats.positive + stats.negative;
    let threshold = 0.85;

    if (total > 0) {
        const fpRate = stats.negative / total;
        // Increase threshold if FP rate is high
        threshold += Math.min(fpRate * 0.1, 0.1);
    }

    console.log(`[Stage 5] Dynamic Threshold for ${repoFullName}: ${threshold.toFixed(2)} (Stats: +${stats.positive} / -${stats.negative})`);

    // 2. Make Decision
    const bestMatch = context.matches.sort((a, b) => b.finalConfidence - a.finalConfidence)[0];

    if (bestMatch && bestMatch.finalConfidence > threshold) {
        return `comment_duplicate (PR #${bestMatch.prNumber})`;
    }

    return 'no_action';
}
