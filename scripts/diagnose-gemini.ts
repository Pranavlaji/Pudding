
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log('🔍 Fetching available models...');
        // Note: The SDK doesn't expose listModels directly on the main class in all versions,
        // but let's try a direct fetch if we can't get it easily, or use a known reliable method.
        // Actually simpler: just try to embed with a few candidates and see which one doesn't throw 404.

        const modelsToTest = [
            'text-embedding-004',
            'embedding-001',
            'models/text-embedding-004',
            'models/embedding-001'
        ];

        console.log('\n--- Testing Embedding Models ---');

        for (const modelName of modelsToTest) {
            process.stdout.write(`Testing ${modelName}: `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.embedContent('Hello world');
                console.log(`✅ SUCCESS! (Vector length: ${result.embedding.values.length})`);
            } catch (error: any) {
                console.log(`❌ FAILED (${error.message?.split('[')[0] || error.message})`);
            }
        }

        console.log('\n--- Testing Generative Models ---');
        const genModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const modelName of genModels) {
            process.stdout.write(`Testing ${modelName}: `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say hi');
                console.log(`✅ SUCCESS!`);
            } catch (error: any) {
                console.log(`❌ FAILED (${error.message?.split('[')[0] || error.message})`);
            }
        }

        console.log('\n--- Testing Embedding on Gemini 2.0 Flash ---');
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.embedContent('Hello world');
            console.log(`✅ SUCCESS! (Vector length: ${result.embedding.values.length})`);
        } catch (error: any) {
            console.log(`❌ FAILED (${error.message?.split('[')[0] || error.message})`);
        }

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

listModels();
