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

        // Use Gemini 2.0 Flash for fast reasoning
        this.model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
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
     * Generates content based on a prompt, expecting a JSON response.
     */
    async generateJSON<T>(prompt: string): Promise<T> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const cleanText = text.replace(/```json\n?|\n?```/g, '');

            return JSON.parse(cleanText) as T;
        } catch (error) {
            console.error('Gemini Generation Error:', error);
            throw error;
        }
    }
}

export const gemini = new GeminiService();

