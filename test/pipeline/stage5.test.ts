import { stage5Decision, DecisionContext } from '../../src/pipeline/stage5.js';
import { feedbackService } from '../../src/services/feedback.js';
import { PullRequestIntent } from '../../src/types.js';
import { SemanticMatch } from '../../src/pipeline/stage4.js';

jest.mock('../../src/services/feedback.js', () => ({
    feedbackService: {
        getFeedbackStats: jest.fn(),
    },
}));

describe('Stage 5: Decision Engine', () => {
    const sourceIntent: PullRequestIntent = {
        problemBeingSolved: 'Fix auth bug',
        affectedComponent: 'Auth',
        behavioralChange: 'Users can login',
        changeType: 'bugfix',
        changeMagnitude: 'minor',
        keyChanges: { files: ['src/auth.ts'] }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Dynamic Threshold Adjustment', () => {
        test('should use base threshold (0.85) when no feedback exists', async () => {
            (feedbackService.getFeedbackStats as jest.Mock).mockResolvedValue({ positive: 0, negative: 0 });

            const context: DecisionContext = {
                sourceIntent,
                matches: [{
                    prNumber: 2,
                    finalConfidence: 0.86, // Just above base threshold
                    semanticScores: { problemSimilarity: 0.9, componentOverlap: 0.8, behavioralEquivalence: 0.9 },
                    justification: 'Same auth fix'
                }]
            };

            const decision = await stage5Decision(context, 'owner/repo');
            expect(decision).toContain('comment_duplicate');
        });

        test('should increase threshold when FP rate is high', async () => {
            // 50% false positive rate -> threshold increases by 0.05
            (feedbackService.getFeedbackStats as jest.Mock).mockResolvedValue({ positive: 10, negative: 10 });

            const context: DecisionContext = {
                sourceIntent,
                matches: [{
                    prNumber: 2,
                    finalConfidence: 0.88, // Above base 0.85, but below adjusted 0.90
                    semanticScores: { problemSimilarity: 0.9, componentOverlap: 0.8, behavioralEquivalence: 0.9 },
                    justification: 'Same auth fix'
                }]
            };

            const decision = await stage5Decision(context, 'owner/repo');
            expect(decision).toBe('no_action');
        });

        test('should cap threshold increase at 0.10', async () => {
            // 100% false positive rate -> threshold capped at 0.95
            (feedbackService.getFeedbackStats as jest.Mock).mockResolvedValue({ positive: 0, negative: 100 });

            const context: DecisionContext = {
                sourceIntent,
                matches: [{
                    prNumber: 2,
                    finalConfidence: 0.94, // Below max 0.95 threshold
                    semanticScores: { problemSimilarity: 0.95, componentOverlap: 0.95, behavioralEquivalence: 0.95 },
                    justification: 'Same fix'
                }]
            };

            const decision = await stage5Decision(context, 'owner/repo');
            expect(decision).toBe('no_action');
        });
    });

    describe('Decision Logic', () => {
        test('should return no_action when no matches', async () => {
            (feedbackService.getFeedbackStats as jest.Mock).mockResolvedValue({ positive: 0, negative: 0 });

            const context: DecisionContext = {
                sourceIntent,
                matches: []
            };

            const decision = await stage5Decision(context, 'owner/repo');
            expect(decision).toBe('no_action');
        });

        test('should select highest confidence match', async () => {
            (feedbackService.getFeedbackStats as jest.Mock).mockResolvedValue({ positive: 0, negative: 0 });

            const matches: SemanticMatch[] = [
                {
                    prNumber: 10,
                    finalConfidence: 0.80, // Below threshold
                    semanticScores: { problemSimilarity: 0.8, componentOverlap: 0.8, behavioralEquivalence: 0.8 },
                    justification: 'Similar'
                },
                {
                    prNumber: 20,
                    finalConfidence: 0.92, // Above threshold - should be selected
                    semanticScores: { problemSimilarity: 0.95, componentOverlap: 0.9, behavioralEquivalence: 0.9 },
                    justification: 'Very similar'
                }
            ];

            const context: DecisionContext = { sourceIntent, matches };

            const decision = await stage5Decision(context, 'owner/repo');
            expect(decision).toBe('comment_duplicate (PR #20)');
        });

        test('should return no_action when best match is below threshold', async () => {
            (feedbackService.getFeedbackStats as jest.Mock).mockResolvedValue({ positive: 0, negative: 0 });

            const matches: SemanticMatch[] = [
                {
                    prNumber: 5,
                    finalConfidence: 0.70, // Below 0.85 threshold
                    semanticScores: { problemSimilarity: 0.7, componentOverlap: 0.7, behavioralEquivalence: 0.7 },
                    justification: 'Somewhat similar'
                }
            ];

            const context: DecisionContext = { sourceIntent, matches };

            const decision = await stage5Decision(context, 'owner/repo');
            expect(decision).toBe('no_action');
        });
    });
});
