import { stage2FileOverlap } from '../../src/pipeline/stage2.js';
import { db } from '../../src/db/index.js';
import { PullRequestData, RepoConfig } from '../../src/types.js';

jest.mock('../../src/db/index.js', () => ({
    db: {
        query: jest.fn(),
    },
}));

describe('Stage 2: File Overlap', () => {
    const mockConfig: RepoConfig = {
        cheapScoreThreshold: 0.3, // 30% overlap needed
    } as RepoConfig;

    const pr: PullRequestData = {
        number: 1,
        files: [
            { path: 'src/auth.ts', status: 'modified' } as any,
            { path: 'src/login.ts', status: 'modified' } as any,
        ]
    } as PullRequestData;

    const candidates = [
        { prNumber: 2, cosineSimilarity: 0.9 }, // High overlap candidate
        { prNumber: 3, cosineSimilarity: 0.8 }, // Low overlap candidate
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return candidate with high file overlap', async () => {
        // Mock DB response:
        // PR 2: Has overlapping files
        // PR 3: Has NO overlapping files
        (db.query as jest.Mock).mockImplementation(async (sql, params) => {
            if (params[0] === 2) {
                return { rows: [{ files_changed: ['src/auth.ts', 'src/utils.ts'] }] };
            }
            if (params[0] === 3) {
                return { rows: [{ files_changed: ['src/other.ts'] }] };
            }
            return { rows: [] };
        });

        const results = await stage2FileOverlap(pr, candidates, mockConfig);

        // PR 2 Logic:
        // Source: {auth, login}
        // Candidate: {auth, utils}
        // Intersection: {auth} (1)
        // Union: {auth, login, utils} (3)
        // Jaccard: 1/3 = 0.33
        // Threshold: 0.3
        // Result: PASS

        expect(results).toHaveLength(1);
        expect(results[0].prNumber).toBe(2);
        expect(results[0].score).toBeCloseTo(0.333, 2);
    });

    test('should calculate 0 overlap correctly', async () => {
        // Only verify non-matching case
        (db.query as jest.Mock).mockResolvedValue({ rows: [{ files_changed: ['src/totally-different.ts'] }] });

        const results = await stage2FileOverlap(pr, [{ prNumber: 99, cosineSimilarity: 0.9 }], mockConfig);
        expect(results).toHaveLength(0);
    });
});
