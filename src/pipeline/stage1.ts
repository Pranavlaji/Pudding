import { PullRequestData, RepoConfig } from '../types.js';
import { db } from '../db/index.js';
import { gemini } from '../services/gemini.js';

export interface EmbeddingMatch {
  prNumber: number;
  cosineSimilarity: number;
}

// Mock embedding generator (384 dimensions for all-MiniLM-L6-v2)
// Removed mock generator

export async function stage1Embeddings(
  pr: PullRequestData,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _config: RepoConfig
): Promise<EmbeddingMatch[]> {
  // 1. Generate Embedding (Gemini 004)
  const textContent = `${pr.title} ${pr.body || ''}`;
  const embedding = await gemini.generateEmbedding(textContent);
  const vectorStr = `[${embedding.join(',')}]`;

  // 2. Query for similar PRs using pgvector (cosine similarity)
  // We filter by repo and ensure we don't match the PR itself
  const query = `
    SELECT 
      pr_number, 
      1 - (embedding <=> $1) as cosine_similarity
    FROM pr_embeddings
    WHERE repo_full_name = $2
      AND pr_number != $3
      AND (1 - (embedding <=> $1)) >= $4
    ORDER BY cosine_similarity DESC
    LIMIT 10;
  `;

  // 0.75 is a reasonable default threshold for "likely related"
  // In Phase 2 this will come from config.cheapScoreThreshold (or similar)
  const threshold = 0.7;

  const result = await db.query(query, [vectorStr, pr.repoFullName, pr.number, threshold]);
  console.log(`Stage 1: Found ${result.rows.length} candidates with threshold ${threshold}`);
  if (result.rows.length > 0) {
    console.log(`Top match score: ${result.rows[0].cosine_similarity}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches: EmbeddingMatch[] = result.rows.map((row: any) => ({
    prNumber: row.pr_number,
    cosineSimilarity: parseFloat(row.cosine_similarity),
  }));

  // 3. Store the current PR's embedding
  const insertQuery = `
    INSERT INTO pr_embeddings (
      repo_full_name, pr_number, head_sha, title, description_snippet, author, state, embedding, files_changed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (repo_full_name, pr_number) 
    DO UPDATE SET 
      embedding = $8,
      files_changed = $9,
      last_activity_at = NOW();
  `;

  await db.query(insertQuery, [
    pr.repoFullName,
    pr.number,
    pr.headSha,
    pr.title,
    (pr.body || '').substring(0, 500),
    pr.author,
    pr.state,
    vectorStr,
    pr.files.map(f => f.path)
  ]);

  return matches;
}
