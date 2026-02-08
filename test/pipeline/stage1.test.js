import { stage1Embeddings } from '../../src/pipeline/stage1.js';
import { db } from '../../src/db/index.js';
import { gemini } from '../../src/services/gemini.js';
// Mock dependencies
jest.mock('../../src/db/index.js', () => ({
    db: {
        query: jest.fn(),
    },
}));
jest.mock('../../src/services/gemini.js', () => ({
    gemini: {
        generateEmbedding: jest.fn(),
    },
}));
describe('Stage 1: Embeddings (Gemini)', () => {
    const mockConfig = {
        repoFullName: 'owner/repo',
    };
    const pr = {
        number: 1,
        repoFullName: 'owner/repo',
        title: 'Fix bug',
        body: 'Fixes a bug',
        headSha: 'abc',
        author: 'user',
        state: 'open',
        files: [], packagesTouched: []
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('should generate embedding via Gemini and query DB', async () => {
        // Mock Gemini response (768d vector)
        const mockVector = new Array(768).fill(0.1);
        gemini.generateEmbedding.mockResolvedValue(mockVector);
        // Mock DB response
        db.query.mockResolvedValueOnce({
            rows: [
                { pr_number: 2, cosine_similarity: 0.9 },
            ],
        });
        // Mock INSERT response
        db.query.mockResolvedValueOnce({ rows: [] });
        const matches = await stage1Embeddings(pr, mockConfig);
        // Verify
        expect(matches).toHaveLength(1);
        expect(gemini.generateEmbedding).toHaveBeenCalledWith('Fix bug Fixes a bug');
        // Check DB Query for correct vector size usage
        expect(db.query).toHaveBeenCalledTimes(2);
        const insertCall = db.query.mock.calls[1];
        expect(insertCall[1][7]).toContain('['); // Vector string present
    });
});
