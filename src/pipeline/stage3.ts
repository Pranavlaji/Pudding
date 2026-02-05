import { PullRequestData, PullRequestIntent } from '../types.js';
import { gemini } from '../services/gemini.js';

export async function stage3IntentExtraction(
    pr: PullRequestData
): Promise<PullRequestIntent> {
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
        return intent;
    } catch (error) {
        console.error('Stage 3 Extraction Failed:', error);
        // Fallback to basic details if LLM fails
        return {
            problemBeingSolved: `Analysis failed for PR #${pr.number}`,
            affectedComponent: 'unknown',
            behavioralChange: 'unknown',
            changeType: 'refactor',
            changeMagnitude: 'minor',
            keyChanges: { files: pr.files.map(f => f.path) }
        };
    }
}
