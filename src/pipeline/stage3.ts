import { PullRequestData, PullRequestIntent } from '../types.js';
import { gemini } from '../services/gemini.js';
import { db } from '../db/index.js';

const MODEL_VERSION = 'gemini-3-pro-preview';

/**
 * Checks the database for a cached intent for this PR/SHA combination.
 */
async function getCachedIntent(repoFullName: string, prNumber: number, headSha: string): Promise<PullRequestIntent | null> {
    const res = await db.query(
        'SELECT intent FROM pr_intents WHERE repo_full_name = $1 AND pr_number = $2 AND head_sha = $3',
        [repoFullName, prNumber, headSha]
    );
    return res.rows.length > 0 ? res.rows[0].intent : null;
}

/**
 * Caches the extracted intent to the database.
 */
async function cacheIntent(repoFullName: string, prNumber: number, headSha: string, intent: PullRequestIntent): Promise<void> {
    await db.query(`
        INSERT INTO pr_intents (repo_full_name, pr_number, head_sha, intent, model_version)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (repo_full_name, pr_number, head_sha)
        DO UPDATE SET intent = $4, model_version = $5
    `, [repoFullName, prNumber, headSha, JSON.stringify(intent), MODEL_VERSION]);
}

export async function stage3IntentExtraction(
    pr: PullRequestData
): Promise<PullRequestIntent> {
    // 1. Check cache first
    const cachedIntent = await getCachedIntent(pr.repoFullName, pr.number, pr.headSha);
    if (cachedIntent) {
        console.log(`[Stage 3] Using cached intent for PR #${pr.number}`);
        return cachedIntent;
    }

    // 2. Extract via LLM
    const fileList = pr.files.map(f => `${f.status}: ${f.path}`).join('\n');
    const prompt = `
    Analyze this Pull Request and extract its intent into a structured JSON format.
    
    TITLE: ${pr.title}
    DESCRIPTION: ${pr.body || 'No description provided.'}
    FILES CHANGED:
    ${fileList.substring(0, 2000)} ${fileList.length > 2000 ? '...(truncated)' : ''}

    Output valid JSON matching this structure:
    {
        "problemBeingSolved": "What specific bug or feature requirement is driving this change?",
        "affectedComponent": "Which logical component (e.g., Auth, Backend API, Frontend Profile) is changing?",
        "behavioralChange": "How does the system behave differently after this change?",
        "changeType": "bugfix" | "feature" | "refactor" | "performance" | "docs" | "test",
        "changeMagnitude": "minor" | "moderate" | "major",
        "keyChanges": {
            "files": ["List of most critical files modified"],
            "functions": ["List of key functions/methods modified if mentioned"]
        }
    }
    `;

    try {
        const intent = await gemini.generateJSON<PullRequestIntent>(prompt);

        // 3. Cache the intent
        await cacheIntent(pr.repoFullName, pr.number, pr.headSha, intent);
        console.log(`[Stage 3] Extracted and cached intent for PR #${pr.number}`);

        return intent;
    } catch (error) {
        console.error('Stage 3 Extraction Failed:', error);
        // Fallback to basic details if LLM fails
        const fallbackIntent: PullRequestIntent = {
            problemBeingSolved: `Analysis failed for PR #${pr.number}`,
            affectedComponent: 'unknown',
            behavioralChange: 'unknown',
            changeType: 'refactor',
            changeMagnitude: 'minor',
            keyChanges: { files: pr.files.map(f => f.path) }
        };

        // Still cache fallback so we don't keep retrying
        await cacheIntent(pr.repoFullName, pr.number, pr.headSha, fallbackIntent);

        return fallbackIntent;
    }
}

