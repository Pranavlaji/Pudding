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
    private embeddingModel: GenerativeModel;

    constructor() {
        // Use Gemini 3.0 Pro for complex reasoning
        this.model = genAI.getGenerativeModel({
            model: 'gemini-3-pro-preview',
            generationConfig: {
                temperature: 0.1, // Low temperature for deterministic/analytical results
                responseMimeType: 'application/json', // Force JSON output for easier parsing
            }
        });

        // Use standard text embedding model (768 dimensions)
        this.embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    }

    /**
     * Generates a vector embedding for the given text.
     * Dimensions: 768
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const result = await this.embeddingModel.embedContent(text);
            const embedding = result.embedding;
            return embedding.values;
        } catch (error) {
            console.error('Gemini Embedding Error:', error);
            throw error;
        }
    }

    /**
     * Generates content based on a prompt, expecting a JSON response.
     */
    async generateJSON<T>(prompt: string): Promise<T> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Clean up markdown code blocks if present (sometimes valid JSON is wrapped)
            const cleanText = text.replace(/```json\n?|\n?```/g, '');

            return JSON.parse(cleanText) as T;
        } catch (error) {
            console.error('Gemini Generation Error:', error);
            throw error;
        }
    }
}

export const gemini = new GeminiService();
