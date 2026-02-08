import { stage3IntentExtraction } from '../../src/pipeline/stage3.js';
import { gemini } from '../../src/services/gemini.js';
jest.mock('../../src/services/gemini.js', () => ({
    gemini: {
        generateJSON: jest.fn(),
    },
}));
describe('Stage 3: Intent Extraction', () => {
    const pr = {
        number: 1,
        title: 'Fix login bug',
        body: 'User cannot login when password has special chars',
        files: [{ path: 'src/auth.ts', status: 'modified' }]
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('should extraction intent via Gemini', async () => {
        const mockIntent = {
            problemBeingSolved: 'Login failure with special chars',
            affectedComponent: 'Auth',
            behavioralChange: 'Sanitize input correctly',
            changeType: 'bugfix',
            changeMagnitude: 'minor',
            keyChanges: { files: ['src/auth.ts'] }
        };
        gemini.generateJSON.mockResolvedValue(mockIntent);
        const result = await stage3IntentExtraction(pr);
        expect(result).toEqual(mockIntent);
        expect(gemini.generateJSON).toHaveBeenCalledWith(expect.stringContaining('TITLE: Fix login bug'));
        expect(gemini.generateJSON).toHaveBeenCalledWith(expect.stringContaining('src/auth.ts'));
    });
    test('should handle errors gracefully', async () => {
        gemini.generateJSON.mockRejectedValue(new Error('API Fail'));
        const result = await stage3IntentExtraction(pr);
        expect(result.problemBeingSolved).toContain('Analysis failed');
        expect(result.changeType).toBe('refactor'); // Default fallback
    });
});
