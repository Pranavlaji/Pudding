import express from 'express';
// import { db } from '../db/index.js';
import { runAnalysisPipeline } from '../pipeline/index.js';
import { monorepoService } from '../services/monorepo.js';
import { feedbackService } from '../services/feedback.js';
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const filesChanged = payload.pull_request.files ? payload.pull_request.files.map((f: any) => ({
                    path: f.filename,  // GitHub API uses 'filename', internal type uses 'path'
                    status: f.status as 'added' | 'modified' | 'deleted' | 'renamed',
                    previousPath: f.previous_filename,
                    additions: f.additions || 0,
                    deletions: f.deletions || 0
                })) : [];

                // Monorepo: Map files to packages
                const packageNames = monorepoService.mapFilesToPackages(filesChanged.map((f: { path: string }) => f.path));
                const prData: PullRequestData = {
                    number: payload.pull_request.number,
                    repoFullName: payload.repository.full_name,
                    title: payload.pull_request.title,
                    body: payload.pull_request.body || '', // Use || '' for potentially null/undefined body
                    headSha: payload.pull_request.head.sha,
                    author: payload.pull_request.user.login,
                    isDraft: payload.pull_request.draft,
                    state: payload.pull_request.state,
                    labels: payload.pull_request.labels.map((l: { name: string }) => l.name),
                    createdAt: new Date(payload.pull_request.created_at),
                    updatedAt: new Date(payload.pull_request.updated_at),
                    files: filesChanged,
                    packagesTouched: packageNames
                };

                // Fire and forget - don't block the webhook response
                runAnalysisPipeline(prData).catch(err => console.error('Pipeline error:', err));
            }
        } else if (event === 'issue_comment') {
            const payload = req.body;
            if (payload.action === 'created') {
                const commentBody = payload.comment.body as string;
                const prNumber = payload.issue.number;
                const userId = payload.comment.user.login;
                const commentId = payload.comment.id;

                // Check if it's a Pull Request comment (issues have the same event, but we only care about PRs)
                // GitHub sends "issue" object even for PR comments, but "issue.pull_request" will be present if it's a PR.
                if (payload.issue.pull_request) {
                    const repoFullName = payload.repository.full_name;
                    if (commentBody.includes('/duplicate')) {
                        await feedbackService.recordFeedback(repoFullName, prNumber, userId, 'positive', commentId);
                    } else if (commentBody.includes('/not-duplicate')) {
                        await feedbackService.recordFeedback(repoFullName, prNumber, userId, 'negative', commentId);
                    }
                }
            }
        }


        res.status(200).send('Accepted');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
