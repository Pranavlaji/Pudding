import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { gemini } from '../services/gemini.js';

const router = express.Router();

// Rate limiting: 20 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: { error: 'Too many requests, please try again later' }
});

router.use(limiter);

// Simple auth check (optional - can add a demo password)
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || ''; // Leave empty to disable

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (DEMO_PASSWORD) {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${DEMO_PASSWORD}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
}

router.use(authMiddleware);

// POST /api/demo/embedding
router.post('/embedding', async (req: Request, res: Response) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }

    console.log(`[Demo API] Embedding request: "${text.substring(0, 50)}..."`);

    try {
        const embedding = await gemini.generateEmbedding(text);
        console.log(`[Demo API] Embedding generated: ${embedding.length} dimensions`);
        res.json({ embedding });
    } catch (error) {
        console.error('[Demo API] Embedding error:', error);
        res.status(500).json({ error: 'Failed to generate embedding' });
    }
});

// POST /api/demo/analyze
router.post('/analyze', async (req: Request, res: Response) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    console.log(`[Demo API] Analyze request: "${prompt.substring(0, 100)}..."`);

    try {
        const result = await gemini.generateJSON(prompt);
        console.log(`[Demo API] Analysis complete:`, result);
        res.json({ result });
    } catch (error) {
        console.error('[Demo API] Analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze' });
    }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        hasApiKey: !!process.env.GEMINI_API_KEY,
        rateLimit: '20 req/min'
    });
});

// ==================== GitHub PR Fetcher ====================
// POST /api/demo/github
router.post('/github', async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url || !url.includes('github.com')) {
            return res.status(400).json({ error: 'Invalid GitHub URL' });
        }

        // Parse owner/repo/pull/id
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid PR URL format' });
        }

        const [, owner, repo, pullNumber] = match;
        console.log(`[Demo API] Fetching PR #${pullNumber} from ${owner}/${repo}`);

        // Construct API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
        const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`;

        // Fetch PR details
        const prResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'DupliGuard-Demo' }
        });

        if (!prResponse.ok) {
            throw new Error(`GitHub API error: ${prResponse.status}`);
        }

        const prData = await prResponse.json();

        // Fetch Files (limit to 5)
        const filesResponse = await fetch(filesUrl, {
            headers: { 'User-Agent': 'DupliGuard-Demo' }
        });
        const filesData = await filesResponse.json();
        const files = Array.isArray(filesData)
            ? filesData.map((f: any) => f.filename).slice(0, 5)
            : [];

        res.json({
            title: prData.title,
            body: prData.body || '',
            files: files,
            number: prData.number,
            state: prData.state
        });

    } catch (error: any) {
        console.error('[Demo API] GitHub fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch PR details. GitHub rate limit might be exceeded.' });
    }
});

export default router;
