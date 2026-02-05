import { PullRequestData, PullRequestIntent } from '../types.js';
import { FileOverlapResult } from './stage2.js';
import { gemini } from '../services/gemini.js';
import { db } from '../db/index.js';

export interface SemanticMatch {
    prNumber: number;
    finalConfidence: number;
    semanticScores: {
        problemSimilarity: number;
        componentOverlap: number;
        behavioralEquivalence: number;
    };
    justification: string;
}

interface ComparisonResult {
    problemSimilarity: number;
    componentOverlap: number;
    behavioralEquivalence: number;
    justification: string;
}

export async function stage4IntentComparison(
    pr: PullRequestData,
    sourceIntent: PullRequestIntent,
    candidates: FileOverlapResult[]
): Promise<SemanticMatch[]> {
    const results: SemanticMatch[] = [];

    for (const candidate of candidates) {
        // 1. Fetch Candidate Intent from DB
        const res = await db.query(
            `SELECT intent FROM pr_intents WHERE repo_full_name = $1 AND pr_number = $2`,
            [pr.repoFullName, candidate.prNumber]
        );

        if (res.rows.length === 0) {
            console.warn(`Skipping semantic comparison for PR #${candidate.prNumber} (No intent cached)`);
            continue;
        }

        const candidateIntent = res.rows[0].intent as PullRequestIntent;

        // 2. Compare via Gemini
        const prompt = `
        Compare the underlying intent of these two Pull Requests to determine if they are duplicates.

        SOURCE PR INTENT:
        ${JSON.stringify(sourceIntent, null, 2)}

        CANDIDATE PR INTENT:
        ${JSON.stringify(candidateIntent, null, 2)}

        Evaluate similarity on 3 axes (0.0 to 1.0):
        1. problemSimilarity: Do they solve the exact same root problem?
        2. componentOverlap: Do they modify the same logic/components?
        3. behavioralEquivalence: Is the end-user or system behavior changed in the same way?

        Output JSON:
        {
            "problemSimilarity": 0.0,
            "componentOverlap": 0.0,
            "behavioralEquivalence": 0.0,
            "justification": "Brief explanation of why they are/aren't duplicates."
        }
        `;

        try {
            const comparison = await gemini.generateJSON<ComparisonResult>(prompt);

            // Weighted Final Score
            // Problem similarity is most important (0.5), then behavior (0.3), then components (0.2)
            const finalConfidence =
                (comparison.problemSimilarity * 0.5) +
                (comparison.behavioralEquivalence * 0.3) +
                (comparison.componentOverlap * 0.2);

            results.push({
                prNumber: candidate.prNumber,
                finalConfidence,
                semanticScores: {
                    problemSimilarity: comparison.problemSimilarity,
                    componentOverlap: comparison.componentOverlap,
                    behavioralEquivalence: comparison.behavioralEquivalence
                },
                justification: comparison.justification
            });

        } catch (error) {
            console.error(`Comparison failed for PR #${candidate.prNumber}`, error);
        }
    }

    return results;
}
