import { PullRequestData, RepoConfig } from '../types.js';
import { EmbeddingMatch } from './stage1.js';
import { db } from '../db/index.js';
import { monorepoService } from '../services/monorepo.js';

export interface FileOverlapResult {
    prNumber: number;
    score: number;
    matchedFiles: string[];
}

export async function stage2FileOverlap(
    pr: PullRequestData,
    candidates: EmbeddingMatch[],
    config: RepoConfig
): Promise<FileOverlapResult[]> {
    const sourceFiles = new Set(pr.files.map((f) => f.path));
    const results: FileOverlapResult[] = [];

    for (const match of candidates) {
        // 1. Fetch files for the candidate PR
        // In a real app, we might check if we have them cached in DB or fetch from GitHub
        // For now, we query the DB assuming we stored them (we didn't yet, so this is partial mock/logic)

        // Fallback: Mock files if not found (since we don't have a full fetcher yet)
        const candidateFiles: string[] = await getCandidateFiles(match.prNumber);

        // Monorepo Filter: If packages don't overlap, skip
        if (pr.packagesTouched && pr.packagesTouched.length > 0) {
            const candidatePackages = monorepoService.mapFilesToPackages(candidateFiles);
            const hasSharedPackage = pr.packagesTouched.some(pkg => candidatePackages.includes(pkg));

            // Allow if either side only touches root or if there's an intersection
            const isStrictMonorepo = !pr.packagesTouched.includes('root') && !candidatePackages.includes('root');

            if (isStrictMonorepo && !hasSharedPackage) {
                console.log(`Skipping PR #${match.prNumber} (Different packages: ${candidatePackages.join(', ')})`);
                continue;
            }
        }

        // 2. Calculate Overlap
        const matchedFiles = candidateFiles.filter((file) => sourceFiles.has(file));
        const overlapCount = matchedFiles.length;
        const unionCount = new Set([...sourceFiles, ...candidateFiles]).size;

        // Jaccard Similarity
        const score = unionCount > 0 ? overlapCount / unionCount : 0;

        if (score >= config.cheapScoreThreshold) {
            results.push({
                prNumber: match.prNumber,
                score,
                matchedFiles
            });
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

// Helper to get files (mock implementation until full sync is ready)
async function getCandidateFiles(prNumber: number): Promise<string[]> {
    const res = await db.query('SELECT files_changed FROM pr_embeddings WHERE pr_number = $1', [prNumber]);
    if (res.rows.length > 0 && res.rows[0].files_changed) {
        return res.rows[0].files_changed;
    }
    return [];
}
