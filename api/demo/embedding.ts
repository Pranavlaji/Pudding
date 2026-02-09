import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GeminiService } from '../../src/services/gemini.js';

const gemini = new GeminiService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }

    try {
        const embedding = await gemini.generateEmbedding(text);
        res.json({ embedding, dimensions: embedding.length });
    } catch (error: any) {
        console.error('Embedding error:', error);
        res.status(500).json({ error: error.message || 'Embedding failed' });
    }
}
