/* eslint-disable @typescript-eslint/no-unused-vars */
import { PullRequestData, RepoConfig } from '../types.js';
// import { loadConfig } from '../config/index.js';

import { stage0QuickExits } from './stage0.js';
import { stage1Embeddings } from './stage1.js';
import { stage2FileOverlap } from './stage2.js';
import { stage3IntentExtraction } from './stage3.js';
import { stage4IntentComparison } from './stage4.js';
import { stage5Decision } from './stage5.js';

// Placeholder stages
// const stage0 = async (_pr: PullRequestData, _config: RepoConfig) => ({ shouldExit: false });
// const stage1 = async (_pr: PullRequestData) => [];
// const stage2 = async (_pr: PullRequestData, _candidates: unknown[]) => [];
// const stage3 = async (_pr: PullRequestData) => ({});
// const stage4 = async (_pr: PullRequestData, _candidates: unknown[]) => [];
// const stage5 = async (_context: unknown) => 'no_action';

export async function runAnalysisPipeline(pr: PullRequestData) {
    console.log(`Starting analysis for PR #${pr.number} in ${pr.repoFullName}`);

    // TODO: Fetch repo config from DB
    const config = {
        repoFullName: pr.repoFullName,
        enabled: true,
        recencyWindowDays: 30,
        cheapScoreThreshold: 0.3,
        semanticScoreThreshold: 0.65,
        highConfidenceThreshold: 0.85,
        bypassAuthors: [],
        ignoreLabels: [],
        ignoreFiles: [],
        isMonorepo: false,
        monorepoConfig: { detectionMethod: 'auto', sharedPackages: [], packagePathMap: {} },
        airGapped: false
    } as RepoConfig;

    // Stage 0: Quick Exits
    const quickExit = await stage0QuickExits(pr, config);
    if (quickExit.shouldExit) {
        console.log(`Exiting early (Stage 0): ${quickExit.reason}`);
        return;
    }

    // Stage 1: Embeddings
    const candidates = await stage1Embeddings(pr, config);
    if (candidates.length === 0) {
        console.log('No candidates found (Stage 1)');
        return;
    }

    // Stage 2: File Overlap
    const cheapMatches = await stage2FileOverlap(pr, candidates, config);
    if (cheapMatches.length === 0) {
        console.log('No cheap matches found (Stage 2)');
        return;
    }

    // Stage 3: Intent Extraction
    const intent = await stage3IntentExtraction(pr);

    // Stage 4: Intent Comparison
    const semanticMatches = await stage4IntentComparison(pr, intent, cheapMatches);

    // Stage 5: Decision
    // Stage 5: Decision
    const decision = await stage5Decision(
        { sourceIntent: intent, matches: semanticMatches },
        pr.repoFullName
    );

    console.log(`Analysis complete. Decision: ${decision}`);
}
