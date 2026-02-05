import { PullRequestData, RepoConfig } from '../types.js';

export interface QuickExitResult {
    shouldExit: boolean;
    reason?: string;
}

export async function stage0QuickExits(
    pr: PullRequestData,
    config: RepoConfig
): Promise<QuickExitResult> {
    // 1. Check for Bot Authors
    if (pr.author.endsWith('[bot]')) {
        return { shouldExit: true, reason: 'author_is_bot' };
    }

    // 2. Check for Bypass Authors
    if (config.bypassAuthors.includes(pr.author)) {
        return { shouldExit: true, reason: 'author_bypass' };
    }

    // 3. Check for Ignored Labels
    const hasIgnoreLabel = pr.labels.some((label) => config.ignoreLabels.includes(label));
    if (hasIgnoreLabel) {
        return { shouldExit: true, reason: 'ignored_label' };
    }

    // 4. Check if Draft (Optional: currently we analyze drafts, but logic can go here)
    // if (pr.isDraft) { ... }

    return { shouldExit: false };
}
