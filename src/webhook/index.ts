import express from 'express';
import { runAnalysisPipeline } from '../pipeline/index.js';
import { PullRequestData } from '../types.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        const delivery = req.headers['x-github-delivery'];

        console.log(`Received event: ${event} (${delivery})`);

        // Handle specific events
        if (event === 'pull_request') {
            const payload = req.body;
            const action = payload.action;

            if (['opened', 'reopened', 'synchronize', 'ready_for_review'].includes(action)) {
                const prData: PullRequestData = {
                    number: payload.pull_request.number,
                    repoFullName: payload.repository.full_name,
                    title: payload.pull_request.title,
                    body: payload.pull_request.body,
                    headSha: payload.pull_request.head.sha,
                    author: payload.pull_request.user.login,
                    isDraft: payload.pull_request.draft,
                    state: payload.pull_request.state,
                    labels: payload.pull_request.labels.map((l: { name: string }) => l.name),
                    createdAt: new Date(payload.pull_request.created_at),
                    updatedAt: new Date(payload.pull_request.updated_at),
                    // Map files from payload if present (for testing) or default to empty
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    files: payload.pull_request.files ? payload.pull_request.files.map((f: any) => ({
                        path: f.filename,
                        status: f.status,
                        additions: 0,
                        deletions: 0,
                        changes: 0
                    })) : []
                };

                // Fire and forget - don't block the webhook response
                runAnalysisPipeline(prData).catch(err => console.error('Pipeline error:', err));
            }
        }

        res.status(200).send('Accepted');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
