import { db } from '../db/index.js';

export type FeedbackType = 'positive' | 'negative';

export class FeedbackService {
    /**
     * Records a feedback event from a user.
     * @param prNumber The PR number where the event occurred.
     * @param userId The GitHub login of the user providing feedback.
     * @param type 'positive' (e.g., /duplicate) or 'negative' (e.g., /not-duplicate).
     * @param commentId Optional ID of the comment that triggered this.
     */
    async recordFeedback(repoFullName: string, prNumber: number, userId: string, type: FeedbackType, commentId?: number): Promise<void> {
        // Try to link to a decision ID if possible (optional)
        const decisionRes = await db.query(
            'SELECT id FROM analysis_decisions WHERE source_pr = $1 AND repo_full_name = $2 ORDER BY created_at DESC LIMIT 1',
            [prNumber, repoFullName]
        );
        const decisionId = decisionRes.rows.length > 0 ? decisionRes.rows[0].id : null;

        await db.query(`
            INSERT INTO feedback_events (repo_full_name, pr_number, user_id, feedback_type, comment_id, decision_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [repoFullName, prNumber, userId, type, commentId ?? null, decisionId]);

        console.log(`[Feedback] Recorded ${type} feedback from ${userId} on ${repoFullName}#${prNumber}`);
    }

    /**
     * Retrieves feedback stats for the entire repo to tune thresholds.
     */
    async getFeedbackStats(repoFullName: string): Promise<{ positive: number; negative: number }> {
        const res = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE feedback_type = 'positive') as positive,
                COUNT(*) FILTER (WHERE feedback_type = 'negative') as negative
            FROM feedback_events
            WHERE repo_full_name = $1
        `, [repoFullName]);

        if (res.rows.length > 0) {
            return {
                positive: parseInt(res.rows[0].positive, 10),
                negative: parseInt(res.rows[0].negative, 10)
            };
        }
        return { positive: 0, negative: 0 };
    }
}

export const feedbackService = new FeedbackService();
