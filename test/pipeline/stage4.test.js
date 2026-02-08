import { stage4IntentComparison } from '../../src/pipeline/stage4.js';
import { gemini } from '../../src/services/gemini.js';
import { db } from '../../src/db/index.js';
jest.mock('../../src/services/gemini.js', () => ({
    gemini: {
        generateJSON: jest.fn(),
    },
}));
jest.mock('../../src/db/index.js', () => ({
    db: {
        query: jest.fn(),
    },
}));
describe('Stage 4: Intent Comparison', () => {
    const pr = {
        number: 1,
        repoFullName: 'owner/repo',
        title: 'New PR',
        body: 'Description',
        files: [], packagesTouched: []
    };
    const sourceIntent = {
        problemBeingSolved: 'Fix bug A',
        affectedComponent: 'Auth',
        behavioralChange: 'Change A',
        changeType: 'bugfix',
        changeMagnitude: 'minor',
        keyChanges: { files: [] }
    };
    const candidates = [
        { prNumber: 2, score: 0.5, files: [], packagesTouched: [], matchedFiles: [] }
    ];
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('should compare intents and return match', async () => {
        // Mock DB returning candidate intent
        db.query.mockResolvedValue({
            rows: [{
                    intent: {
                        problemBeingSolved: 'Fix bug A', // Same problem
                        affectedComponent: 'Auth',
                        behavioralChange: 'Change A',
                        changeType: 'bugfix',
                        changeMagnitude: 'minor',
                        keyChanges: { files: [], packagesTouched: [] }
                    }
                }]
        });
        // Mock Gemini comparison result
        gemini.generateJSON.mockResolvedValue({
            problemSimilarity: 0.9,
            componentOverlap: 1.0,
            behavioralEquivalence: 0.9,
            justification: 'Identical intent'
        });
        const matches = await stage4IntentComparison(pr, sourceIntent, candidates);
        expect(matches).toHaveLength(1);
        expect(matches[0].prNumber).toBe(2);
        // Score: (0.9*0.5) + (0.9*0.3) + (1.0*0.2) = 0.45 + 0.27 + 0.2 = 0.92
        expect(matches[0].finalConfidence).toBeCloseTo(0.92, 2);
    });
    test('should skip candidates missing intent in DB', async () => {
        db.query.mockResolvedValue({ rows: [] }); // No intent found
        const matches = await stage4IntentComparison(pr, sourceIntent, candidates);
        expect(matches).toHaveLength(0);
        expect(gemini.generateJSON).not.toHaveBeenCalled();
    });
});
