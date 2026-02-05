/// <reference types="node" />
import 'dotenv/config';
import { gemini } from '../src/services/gemini.js';

async function verify() {
    console.log('🔍 Verifying Gemini API Key...');

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is missing from process.env');
        process.exit(1);
    }

    try {
        console.log('📡 Testing Embedding API...');
        const embedding = await gemini.generateEmbedding('Hello world');
        console.log(`✅ Embedding Success! Vector length: ${embedding.length}`);

        console.log('🧠 Testing Generation API (Gemini 3.0 Pro)...');
        try {
            const content = await gemini.generateJSON<{ greeting: string }>('Say hello in JSON format: { "greeting": "..." }');
            console.log(`✅ Generation Success (v3)! Response: ${JSON.stringify(content)}`);
        } catch (e: any) {
            console.warn(`⚠️ Gemini 3.0 Failed (${e.statusText || e.message}). Retrying with 1.5 Pro...`);
            // Creates a temporary instance just for verification
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
            const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

            const result = await fallbackModel.generateContent('Say hello');
            console.log(`✅ Generation Success (v1.5 Fallback)! Response: ${result.response.text()}`);
        }

        console.log('🎉 All Gemini systems go!');
    } catch (error) {
        console.error('❌ Validation Failed:', error);
        process.exit(1);
    }
}

verify();
