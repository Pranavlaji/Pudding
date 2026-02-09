import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { loadConfig } from '../config/index.js';

const config = loadConfig();

// Ensure API key is present
if (!config.geminiApiKey) {
    console.warn('⚠️ GEMINI_API_KEY is missing. LLM features will fail.');
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey || '');

export class GeminiService {
    private model: GenerativeModel;
    private apiKey: string;

    constructor() {
        this.apiKey = config.geminiApiKey || '';

        // Use Gemini 3.0 Pro (Experimental) per user request
        this.model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
            }
        });
    }

    /**
     * Generates a deterministic vector embedding using local Bag-of-Words hashing.
     * This avoids API rate limits (429) and provides a "good enough" baseline for the demo.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        console.log('[Gemini] Generating local BoW embedding to save API quota...');

        // Simple tokenizer
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3); // Filter short words

        // Deterministic hashing into 768-dim vector
        const vector = new Array(768).fill(0);

        for (const word of words) {
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = ((hash << 5) - hash) + word.charCodeAt(i);
                hash |= 0;
            }
            const index = Math.abs(hash) % 768;
            vector[index] += 1;
        }

        // Normalize vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / (magnitude || 1));
    }

    /**
     * Generates structured JSON output using Gemini.
     * Includes retry logic for 429 Rate Limits.
     */
    async generateJSON<T = any>(prompt: string): Promise<T> {
        let retries = 3;
        let delay = 2000;

        while (retries > 0) {
            try {
                const result = await this.model.generateContent(prompt);
                const text = result.response.text();

                // Clean up code blocks if present
                const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(jsonStr);
            } catch (error: any) {
                if (error.status === 429 || error.message?.includes('429')) {
                    console.warn(`[Gemini] Rate limited (429). Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries--;
                    delay *= 2; // Exponential backoff
                    continue;
                }
                console.error('[Gemini] JSON Generation failed:', error);
                throw error;
            }
        }
        throw new Error('Gemini API request failed after retries');
    }
}

export const gemini = new GeminiService();
