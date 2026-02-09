import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GeminiService } from '../../src/services/gemini.js';

const gemini = new GeminiService();

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

    const { prompt, schema } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    try {
        const result = await gemini.generateJSON(prompt);
        res.json(result);
    } catch (error: any) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message || 'Generation failed' });
    }
}
