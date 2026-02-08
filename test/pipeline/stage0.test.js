import { stage0QuickExits } from '../../src/pipeline/stage0.js';
describe('Stage 0: Quick Exits', () => {
    const mockConfig = {
        repoFullName: 'owner/repo',
        enabled: true,
        recencyWindowDays: 30,
        cheapScoreThreshold: 0.3,
        semanticScoreThreshold: 0.1,
        highConfidenceThreshold: 0.85,
        bypassAuthors: ['bypass-user'],
        ignoreLabels: ['ignore-me'],
        ignoreFiles: [],
        isMonorepo: false,
        monorepoConfig: {
            detectionMethod: 'auto',
            sharedPackages: [],
            packagePathMap: {}
        },
        airGapped: false,
    };
    const basePr = {
        number: 1,
        repoFullName: 'owner/repo',
        title: 'Test PR',
        body: 'Test Body',
        headSha: 'abc',
        author: 'user',
        isDraft: false,
        state: 'open',
        labels: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        files: [], packagesTouched: []
    };
    test('should exit for bot authors (endswith [bot])', async () => {
        const pr = { ...basePr, author: 'renovate[bot]' };
        const result = await stage0QuickExits(pr, mockConfig);
        expect(result.shouldExit).toBe(true);
        expect(result.reason).toContain('author_is_bot');
    });
    test('should exit for bypassed authors', async () => {
        const pr = { ...basePr, author: 'bypass-user' };
        const result = await stage0QuickExits(pr, mockConfig);
        expect(result.shouldExit).toBe(true);
        expect(result.reason).toContain('author_bypass');
    });
    test('should exit for ignored labels', async () => {
        const pr = { ...basePr, labels: ['ignore-me', 'bug'] };
        const result = await stage0QuickExits(pr, mockConfig);
        expect(result.shouldExit).toBe(true);
        expect(result.reason).toContain('ignored_label');
    });
    test('should NOT exit for normal PRs', async () => {
        const pr = { ...basePr, author: 'normal-user', labels: ['bug'] };
        const result = await stage0QuickExits(pr, mockConfig);
        expect(result.shouldExit).toBe(false);
    });
});
