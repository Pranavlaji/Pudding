import { stage2FileOverlap } from '../../src/pipeline/stage2.js';
import { db } from '../../src/db/index.js';
jest.mock('../../src/db/index.js', () => ({
    db: {
        query: jest.fn(),
    },
}));
describe('Stage 2: File Overlap', () => {
    const mockConfig = {
        cheapScoreThreshold: 0.3, // 30% overlap needed
    };
    const pr = {
        number: 1,
        files: [
            { path: 'src/auth.ts', status: 'modified' },
            { path: 'src/login.ts', status: 'modified' },
        ]
    };
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
        db.query.mockImplementation(async (sql, params) => {
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
        db.query.mockResolvedValue({ rows: [{ files_changed: ['src/totally-different.ts'] }] });
        const results = await stage2FileOverlap(pr, [{ prNumber: 99, cosineSimilarity: 0.9 }], mockConfig);
        expect(results).toHaveLength(0);
    });
    test('should filter out candidates from different packages', async () => {
        // Source touches apps/web
        // Cast to any to bypass strict type check on mock data if needed or rely on Partial
        const webPr = { ...pr, packagesTouched: ['apps/web'] };
        // Candidate touches apps/mobile
        db.query.mockResolvedValue({
            rows: [{ files_changed: ['apps/mobile/src/main.ts'] }]
        });
        const candidates = [{ prNumber: 2, cosineSimilarity: 0.9 }];
        // We expect 0 because they are in different packages
        const results = await stage2FileOverlap(webPr, candidates, mockConfig);
        expect(results).toHaveLength(0);
    });
    test('should allow candidates from same package', async () => {
        const webPr = {
            ...pr,
            files: [{ path: 'apps/web/auth.ts', status: 'modified' }],
            packagesTouched: ['apps/web']
        };
        db.query.mockResolvedValue({
            rows: [{ files_changed: ['apps/web/auth.ts'] }]
        });
        const candidates = [{ prNumber: 2, cosineSimilarity: 0.9 }];
        const results = await stage2FileOverlap(webPr, candidates, mockConfig);
        expect(results).toHaveLength(1);
    });
});
