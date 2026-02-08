import { feedbackService } from '../../src/services/feedback.js';
import { db } from '../../src/db/index.js';

jest.mock('../../src/db/index.js', () => ({
    db: {
        query: jest.fn(),
    },
}));

describe('FeedbackService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should record positive feedback', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [] });

        await feedbackService.recordFeedback('owner/repo', 123, 'user1', 'positive');

        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO feedback_events'),
            ['owner/repo', 123, 'user1', 'positive', null, null]
        );
    });

    test('should record negative feedback with comment ID', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [] });

        await feedbackService.recordFeedback('owner/repo', 456, 'user2', 'negative', 999);

        expect(db.query).toHaveBeenCalledWith(
            expect.any(String),
            ['owner/repo', 456, 'user2', 'negative', 999, null]
        );
    });
});
