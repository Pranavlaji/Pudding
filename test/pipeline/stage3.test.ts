import { stage3IntentExtraction } from '../../src/pipeline/stage3.js';
import { gemini } from '../../src/services/gemini.js';
import { db } from '../../src/db/index.js';
import { PullRequestData, PullRequestIntent } from '../../src/types.js';

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

describe('Stage 3: Intent Extraction', () => {
    const pr: PullRequestData = {
        number: 1,
        repoFullName: 'owner/repo',
        headSha: 'abc123',
        title: 'Fix login bug',
        body: 'User cannot login when password has special chars',
        files: [{ path: 'src/auth.ts', status: 'modified' }]
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should use cached intent if available', async () => {
        const cachedIntent: PullRequestIntent = {
            problemBeingSolved: 'Cached problem',
            affectedComponent: 'Cached',
            behavioralChange: 'Cached change',
            changeType: 'bugfix',
            changeMagnitude: 'minor',
            keyChanges: { files: ['cached.ts'] }
        };

        // DB returns cached intent
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ intent: cachedIntent }] });

        const result = await stage3IntentExtraction(pr);

        expect(result).toEqual(cachedIntent);
        expect(gemini.generateJSON).not.toHaveBeenCalled(); // Should not call LLM
    });

    test('should extract and cache intent via Gemini when not cached', async () => {
        const mockIntent: PullRequestIntent = {
            problemBeingSolved: 'Login failure with special chars',
            affectedComponent: 'Auth',
            behavioralChange: 'Sanitize input correctly',
            changeType: 'bugfix',
            changeMagnitude: 'minor',
            keyChanges: { files: ['src/auth.ts'] }
        };

        // DB returns no cached intent, then INSERT succeeds
        (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [] }) // No cache
            .mockResolvedValueOnce({ rows: [] }); // INSERT

        (gemini.generateJSON as jest.Mock).mockResolvedValue(mockIntent);

        const result = await stage3IntentExtraction(pr);

        expect(result).toEqual(mockIntent);
        expect(gemini.generateJSON).toHaveBeenCalledWith(expect.stringContaining('TITLE: Fix login bug'));

        // Verify intent was cached
        expect(db.query).toHaveBeenCalledTimes(2);
        expect(db.query).toHaveBeenLastCalledWith(
            expect.stringContaining('INSERT INTO pr_intents'),
            expect.arrayContaining(['owner/repo', 1, 'abc123'])
        );
    });

    test('should handle errors gracefully and cache fallback', async () => {
        // No cache
        (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] }); // INSERT fallback

        (gemini.generateJSON as jest.Mock).mockRejectedValue(new Error('API Fail'));

        const result = await stage3IntentExtraction(pr);

        expect(result.problemBeingSolved).toContain('Analysis failed');
        expect(result.changeType).toBe('refactor'); // Default fallback

        // Should still cache the fallback
        expect(db.query).toHaveBeenCalledTimes(2);
    });
});

