import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Parse GitHub PR URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!match) {
        return res.status(400).json({ error: 'Invalid GitHub PR URL' });
    }

    const [, owner, repo, prNumber] = match;

    try {
        // Fetch PR details
        const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Pudding-Demo'
            }
        });

        if (!prRes.ok) {
            throw new Error(`GitHub API error: ${prRes.status}`);
        }

        const prData = await prRes.json();

        // Fetch files
        const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Pudding-Demo'
            }
        });

        const filesData = await filesRes.json();
        const files = filesData.map((f: any) => f.filename);

        // Extract code diffs
        const patches = filesData
            .filter((f: any) => f.patch)
            .map((f: any) => `// ${f.filename}\n${f.patch}`);
        const diff = patches.join('\n\n');

        res.json({
            title: prData.title,
            body: prData.body || '',
            files: files,
            diff: diff,
            number: prData.number,
            state: prData.state
        });
    } catch (error: any) {
        console.error('GitHub fetch error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch PR' });
    }
}
