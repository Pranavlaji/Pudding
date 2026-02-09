/**
 * DupliGuard - Duplicate PR Detector Demo
 * Powered by Gemini 3
 * Uses backend API proxy for secure API key handling
 */

// Configuration
const CONFIG = {
    API_BASE: '/api/demo',
    DUPLICATE_THRESHOLD: 0.75
};

// DOM Elements
const analyzeBtn = document.getElementById('analyze-btn');
const pipelineSection = document.getElementById('pipeline-section');
const resultSection = document.getElementById('result-section');
const fetchGhBtn = document.getElementById('fetch-gh-btn');

// State
let analysisResults = {};
let selectedPoolPRs = [];

// ==================== Sample PR Pool Data ====================
const PR_POOL = {
    'auth-fix-1': {
        title: 'Fix authentication bug for special characters',
        body: 'When users have special characters like @ or # in passwords, login fails. This PR sanitizes the input before validation.',
        files: ['src/auth/login.ts', 'src/utils/sanitize.ts'],
        diff: `// src/auth/login.ts
function validatePassword(password: string): boolean {
-  return password.length >= 8;
+  // Sanitize special characters before validation
+  const sanitized = password.replace(/[@#$%^&*]/g, '');
+  return sanitized.length >= 8;
}

// src/utils/sanitize.ts  
+export function sanitizeInput(input: string): string {
+  return input.replace(/[^a-zA-Z0-9]/g, '_');
+}`
    },
    'auth-fix-2': {
        title: 'Handle special chars in password validation',
        body: 'Users reported login issues when passwords contain symbols. Added input sanitization to fix this.',
        files: ['src/auth/login.ts', 'src/auth/validate.ts'],
        diff: `// src/auth/login.ts
function validatePassword(pwd: string): boolean {
-  if (pwd.length < 8) return false;
+  // Handle special symbols in passwords
+  const cleanPwd = pwd.replace(/[!@#$%]/g, '');
+  if (cleanPwd.length < 8) return false;
   return true;
}

// src/auth/validate.ts
+function escapeSpecialChars(str: string): string {
+  return str.replace(/[^\\w]/g, '');
+}`
    },
    'docs-update': {
        title: 'Update API documentation',
        body: 'Updated README and API docs to reflect new endpoints and authentication changes.',
        files: ['README.md', 'docs/api.md'],
        diff: `// README.md
-## API v1.0
+## API v2.0
+
+### New Endpoints
+- POST /api/auth/login
+- POST /api/auth/refresh

// docs/api.md
+# Authentication
+All endpoints require Bearer token.`
    },
    'perf-cache': {
        title: 'Add Redis caching layer',
        body: 'Implements Redis caching for frequently accessed data to improve response times.',
        files: ['src/cache/redis.ts', 'src/config.ts'],
        diff: `// src/cache/redis.ts
+import Redis from 'ioredis';
+
+export class CacheService {
+  private client: Redis;
+  
+  async get(key: string): Promise<string | null> {
+    return this.client.get(key);
+  }
+  
+  async set(key: string, value: string, ttl: number) {
+    await this.client.setex(key, ttl, value);
+  }
+}`
    }
};

// ==================== Event Listeners ====================
analyzeBtn.addEventListener('click', runAnalysis);
fetchGhBtn?.addEventListener('click', fetchGitHubPRs);

// PR Pool Selection
document.querySelectorAll('.pool-card').forEach(card => {
    card.addEventListener('click', () => togglePoolCard(card));
});

document.getElementById('pool-load-btn')?.addEventListener('click', loadSelectedPoolPRs);
document.getElementById('toggle-github')?.addEventListener('click', toggleGitHubSection);

// ==================== Logging ====================
function log(stage, message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [Stage ${stage}]`;
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

// ==================== PR Pool Functions ====================
function togglePoolCard(card) {
    const poolId = card.dataset.poolId;
    const prData = PR_POOL[poolId];

    // If already selected, deselect
    if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        card.removeAttribute('data-slot');
        selectedPoolPRs = selectedPoolPRs.filter(id => id !== poolId);
        return;
    }

    // Determine which slot to fill (first empty)
    let slot;
    if (selectedPoolPRs.length === 0) {
        slot = 1;
    } else if (selectedPoolPRs.length === 1) {
        // Check which slot is taken
        const firstCard = document.querySelector('.pool-card.selected');
        slot = firstCard?.dataset.slot === '1' ? 2 : 1;
    } else {
        // Both slots full - deselect oldest and use its slot
        const oldestId = selectedPoolPRs.shift();
        const oldestCard = document.querySelector(`[data-pool-id="${oldestId}"]`);
        slot = parseInt(oldestCard.dataset.slot);
        oldestCard.classList.remove('selected');
        oldestCard.removeAttribute('data-slot');
    }

    // Select this card
    card.classList.add('selected');
    card.dataset.slot = slot;
    selectedPoolPRs.push(poolId);

    // Auto-load into the PR form
    loadPRtoSlot(prData, slot);
}

function loadPRtoSlot(prData, slot) {
    const prefix = `pr${slot}`;

    document.getElementById(`${prefix}-title`).value = prData.title;
    document.getElementById(`${prefix}-body`).value = prData.body;
    document.getElementById(`${prefix}-files`).value = prData.files.join(', ');
    if (document.getElementById(`${prefix}-diff`)) {
        document.getElementById(`${prefix}-diff`).value = prData.diff;
    }

    // Visual pulse on the PR card
    const prCard = document.querySelector(`.pr-card[data-pr="${slot}"]`);
    prCard.style.animation = 'pulse 0.5s ease';
    setTimeout(() => prCard.style.animation = '', 500);

    console.log(`[Pool] Loaded ${prData.title} → PR${slot}`);
}

function loadSelectedPoolPRs() {
    // Deprecated - auto-loading now
}

function toggleGitHubSection() {
    const section = document.getElementById('github-imports');
    section.classList.toggle('collapsed');
}

// ==================== Main Analysis Flow ====================
async function runAnalysis() {
    // Get PR data including code diff
    const pr1 = {
        title: document.getElementById('pr1-title').value,
        body: document.getElementById('pr1-body').value,
        files: document.getElementById('pr1-files').value.split(',').map(f => f.trim()),
        diff: document.getElementById('pr1-diff')?.value || ''
    };

    const pr2 = {
        title: document.getElementById('pr2-title').value,
        body: document.getElementById('pr2-body').value,
        files: document.getElementById('pr2-files').value.split(',').map(f => f.trim()),
        diff: document.getElementById('pr2-diff')?.value || ''
    };

    log(0, 'Starting analysis', { pr1, pr2 });

    // Reset UI
    resetUI();
    analyzeBtn.classList.add('loading');
    pipelineSection.classList.add('visible');

    try {
        // Stage 1: Embedding Similarity
        await runStage(1, async () => {
            log(1, 'Computing embedding similarity...');
            const similarity = await computeEmbeddingSimilarity(pr1, pr2);
            analysisResults.embeddingSimilarity = similarity;
            log(1, 'Embedding similarity computed', { similarity });
            return { score: similarity, result: `Cosine similarity: ${similarity.toFixed(3)}` };
        });

        // Stage 2: File Overlap
        await runStage(2, async () => {
            log(2, 'Computing file overlap...');
            const overlap = computeFileOverlap(pr1.files, pr2.files);
            analysisResults.fileOverlap = overlap;
            log(2, 'File overlap computed', { overlap, files1: pr1.files, files2: pr2.files });
            return { score: overlap, result: `${Math.round(overlap * 100)}% file overlap` };
        });

        // Stage 3: Intent Extraction
        await runStage(3, async () => {
            log(3, 'Extracting intents via Gemini 3...');
            const intents = await extractIntents(pr1, pr2);
            analysisResults.intents = intents;
            log(3, 'Intents extracted', intents);
            return {
                score: null,
                result: `PR1: "${intents.pr1.problemBeingSolved.substring(0, 50)}..."`
            };
        });

        // Intentional delay to avoid 429 Rate Limits and improve demo pacing
        await sleep(2000);

        // Stage 4: Intent Comparison
        await runStage(4, async () => {
            log(4, 'Comparing intents via Gemini 3...');
            const comparison = await compareIntents(analysisResults.intents);
            analysisResults.intentComparison = comparison;
            log(4, 'Intent comparison complete', comparison);
            return {
                score: comparison.overallSimilarity,
                result: `Problem: ${comparison.problemSimilarity.toFixed(2)} | Component: ${comparison.componentOverlap.toFixed(2)}`
            };
        });

        // Stage 5: Decision
        await runStage(5, async () => {
            log(5, 'Making final decision...');
            const decision = makeDecision(analysisResults);
            analysisResults.decision = decision;
            log(5, 'Decision made', decision);
            return {
                score: decision.confidence,
                result: decision.isDuplicate ? '🔴 DUPLICATE' : '🟢 UNIQUE'
            };
        });

        // Show results
        log(5, 'Analysis complete!', analysisResults);
        showResults(analysisResults);

    } catch (error) {
        console.error('[ERROR] Analysis failed:', error);
        alert('Analysis failed: ' + error.message + '\n\nCheck the browser console for details.');
    } finally {
        analyzeBtn.classList.remove('loading');
    }
}



// ==================== GitHub Fetching ====================
async function fetchGitHubPRs() {
    const url1 = document.getElementById('gh-url-1').value.trim();
    const url2 = document.getElementById('gh-url-2').value.trim();

    if (!url1 || !url2) {
        alert('Please enter two GitHub PR URLs');
        return;
    }

    fetchGhBtn.classList.add('loading');
    fetchGhBtn.innerHTML = '<span class="btn-loader"></span> Loading...';

    try {
        const [pr1, pr2] = await Promise.all([
            fetchPR(url1),
            fetchPR(url2)
        ]);

        // Populate PR 1
        document.getElementById('pr1-title').value = pr1.title;
        document.getElementById('pr1-body').value = pr1.body;
        document.getElementById('pr1-files').value = pr1.files.join(', ');
        if (document.getElementById('pr1-diff') && pr1.diff) {
            document.getElementById('pr1-diff').value = pr1.diff;
        }

        // Populate PR 2
        document.getElementById('pr2-title').value = pr2.title;
        document.getElementById('pr2-body').value = pr2.body;
        document.getElementById('pr2-files').value = pr2.files.join(', ');
        if (document.getElementById('pr2-diff') && pr2.diff) {
            document.getElementById('pr2-diff').value = pr2.diff;
        }

        // Visual feedback
        document.querySelectorAll('.pr-card').forEach(card => {
            card.classList.add('pulse');
            setTimeout(() => card.classList.remove('pulse'), 500);
        });

    } catch (error) {
        alert('Failed to fetch PRs: ' + error.message);
    } finally {
        fetchGhBtn.classList.remove('loading');
        fetchGhBtn.innerHTML = 'Load PRs';
    }
}

async function fetchPR(url) {
    const response = await fetch(`${CONFIG.API_BASE}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fetch failed');
    }

    return response.json();
}

// ==================== Pipeline Stages ====================
async function runStage(stageNum, fn) {
    const stageEl = document.getElementById(`stage-${stageNum}`);
    const scoreEl = document.getElementById(`stage-${stageNum}-score`);
    const resultEl = document.getElementById(`stage-${stageNum}-result`);

    // Mark as active
    stageEl.classList.add('active');

    // Simulate minimum processing time for visual effect
    const startTime = Date.now();
    const result = await fn();
    const elapsed = Date.now() - startTime;
    if (elapsed < 500) {
        await sleep(500 - elapsed);
    }

    // Mark as complete
    stageEl.classList.remove('active');
    stageEl.classList.add('complete');

    // Update UI
    if (result.score !== null) {
        scoreEl.textContent = typeof result.score === 'number'
            ? (result.score * 100).toFixed(0) + '%'
            : result.score;
    }
    resultEl.textContent = result.result;

    return result;
}

// ==================== Stage 1: Embeddings ====================
async function computeEmbeddingSimilarity(pr1, pr2) {
    const text1 = `${pr1.title} ${pr1.body}`;
    const text2 = `${pr2.title} ${pr2.body}`;

    // Get embeddings from backend
    const [emb1, emb2] = await Promise.all([
        getEmbedding(text1),
        getEmbedding(text2)
    ]);

    // Compute cosine similarity
    return cosineSimilarity(emb1, emb2);
}

async function getEmbedding(text) {
    const response = await fetch(`${CONFIG.API_BASE}/embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Embedding API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
}

function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==================== Stage 2: File Overlap ====================
function computeFileOverlap(files1, files2) {
    const set1 = new Set(files1);
    const set2 = new Set(files2);

    let intersection = 0;
    for (const file of set1) {
        if (set2.has(file)) intersection++;
    }

    const union = new Set([...files1, ...files2]).size;
    return union > 0 ? intersection / union : 0;
}

async function extractIntents(pr1, pr2) {
    const prompt = `Analyze these two Pull Requests and extract their intents. Pay special attention to the CODE DIFF to understand what changes are being made.

PR #1:
Title: ${pr1.title}
Description: ${pr1.body}
Files: ${pr1.files.join(', ')}
Code Diff:
\`\`\`
${pr1.diff || 'No diff provided'}
\`\`\`

PR #2:
Title: ${pr2.title}
Description: ${pr2.body}
Files: ${pr2.files.join(', ')}
Code Diff:
\`\`\`
${pr2.diff || 'No diff provided'}
\`\`\`

Return a JSON object with this exact structure:
{
    "pr1": {
        "problemBeingSolved": "What specific bug or feature is this addressing?",
        "affectedComponent": "Which component/module is being changed?",
        "behavioralChange": "How does behavior change after this PR?",
        "codeApproach": "What is the technical approach in the diff? (e.g., regex sanitization, validation refactor)"
    },
    "pr2": {
        "problemBeingSolved": "What specific bug or feature is this addressing?",
        "affectedComponent": "Which component/module is being changed?",
        "behavioralChange": "How does behavior change after this PR?",
        "codeApproach": "What is the technical approach in the diff?"
    }
}`;

    const response = await fetch(`${CONFIG.API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Intent extraction failed');
    }

    const data = await response.json();
    let result = data.result;

    // Handle array response from Gemini (e.g. [{pr1: ...}, {pr2: ...}])
    if (Array.isArray(result)) {
        console.log('[App] Normalizing array response from Gemini');
        result = result.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    }

    return result;
}

// ==================== Stage 4: Intent Comparison ====================
async function compareIntents(intents) {
    const prompt = `Compare these two PR intents and their code approaches. Score their similarity.

PR #1 Intent:
- Problem: ${intents.pr1.problemBeingSolved}
- Component: ${intents.pr1.affectedComponent}
- Behavioral Change: ${intents.pr1.behavioralChange}
- Code Approach: ${intents.pr1.codeApproach || 'Not analyzed'}

PR #2 Intent:
- Problem: ${intents.pr2.problemBeingSolved}
- Component: ${intents.pr2.affectedComponent}
- Behavioral Change: ${intents.pr2.behavioralChange}
- Code Approach: ${intents.pr2.codeApproach || 'Not analyzed'}

Return a JSON object with this exact structure (scores from 0.0 to 1.0):
{
    "problemSimilarity": 0.0,
    "componentOverlap": 0.0,
    "behavioralEquivalence": 0.0,
    "codeSimilarity": 0.0,
    "overallSimilarity": 0.0,
    "justification": "Brief explanation of why these are or aren't duplicates, focusing on the code changes"
}`;

    const response = await fetch(`${CONFIG.API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Intent comparison failed');
    }

    const data = await response.json();
    let result = data.result;

    // Handle array response from Gemini
    if (Array.isArray(result)) {
        console.log('[App] Normalizing array response from Gemini (Stage 4)');
        // If it's an array with one object, use that object
        if (result.length > 0) {
            result = result[0];
        } else {
            // Fallback for empty array
            result = {
                problemSimilarity: 0,
                componentOverlap: 0,
                behavioralEquivalence: 0,
                overallSimilarity: 0,
                justification: "Analysis failed to produce a valid comparison."
            };
        }
    }

    return result;
}

// ==================== Stage 5: Decision ====================
function makeDecision(results) {
    let weights = {
        embedding: 0.10,
        fileOverlap: 0.10,
        intentSimilarity: 0.80
    };

    // If embedding is negative/random (API fallback), ignore it and rebalance weights
    // Real cosine similarity for these PRs should be > 0.7
    if (results.embeddingSimilarity < 0.1) {
        console.log('[stage 5] Detected fallback embedding, rebalancing weights...');
        weights = {
            embedding: 0.0,
            fileOverlap: 0.20,
            intentSimilarity: 0.80
        };
    }

    let confidence =
        (Math.max(0, results.embeddingSimilarity) * weights.embedding) +
        (results.fileOverlap * weights.fileOverlap) +
        (results.intentComparison.overallSimilarity * weights.intentSimilarity);

    // CONFIDENCE FLOOR: When Gemini is highly confident (>90%), trust it!
    // Don't let low-quality signals (BoW, file overlap) drag down the score.
    const geminiConfidence = results.intentComparison.overallSimilarity;
    if (geminiConfidence >= 0.90 && confidence < 0.85) {
        console.log(`[stage 5] Gemini is highly confident (${(geminiConfidence * 100).toFixed(0)}%), boosting to 85% floor`);
        confidence = 0.85;
    }

    return {
        isDuplicate: confidence >= CONFIG.DUPLICATE_THRESHOLD,
        confidence,
        justification: results.intentComparison.justification,
        breakdown: {
            problemSimilarity: results.intentComparison.problemSimilarity,
            componentOverlap: results.intentComparison.componentOverlap,
            behavioralEquivalence: results.intentComparison.behavioralEquivalence,
            codeSimilarity: results.intentComparison.codeSimilarity || 0
        }
    };
}

// ==================== UI Helpers ====================
function resetUI() {
    // Reset stages
    document.querySelectorAll('.stage').forEach(stage => {
        stage.classList.remove('active', 'complete');
    });
    document.querySelectorAll('.stage-score').forEach(el => el.textContent = '');
    document.querySelectorAll('.stage-result').forEach(el => el.textContent = '');

    // Hide results
    resultSection.classList.remove('visible');
    pipelineSection.classList.remove('visible');

    // Reset results
    analysisResults = {};
}

function showResults(results) {
    resultSection.classList.add('visible');

    const resultCard = document.getElementById('result-card');
    const resultIcon = document.getElementById('result-icon');
    const resultLabel = document.getElementById('result-label');
    const scoreValue = document.getElementById('score-value');
    const scoreCircle = document.getElementById('score-circle');
    const explanation = document.getElementById('result-explanation');

    const decision = results.decision;
    const confidence = Math.round(decision.confidence * 100);

    // Update card styling
    resultCard.classList.remove('duplicate', 'safe');
    resultCard.classList.add(decision.isDuplicate ? 'duplicate' : 'safe');

    // Update content
    resultIcon.textContent = decision.isDuplicate ? '🔴' : '🟢';
    resultLabel.textContent = decision.isDuplicate
        ? 'HIGH CONFIDENCE DUPLICATE'
        : 'LIKELY UNIQUE';
    scoreValue.textContent = confidence + '%';
    explanation.textContent = decision.justification;

    // Animate score ring
    const circumference = 2 * Math.PI * 45; // r=45
    const offset = circumference - (confidence / 100) * circumference;
    scoreCircle.style.strokeDashoffset = offset;

    // Update breakdown bars
    const breakdown = decision.breakdown;
    updateBreakdown('Problem Similarity', breakdown.problemSimilarity);
    updateBreakdown('Component Overlap', breakdown.componentOverlap);
    updateBreakdown('Behavioral Equivalence', breakdown.behavioralEquivalence);
}

function updateBreakdown(label, value) {
    const items = document.querySelectorAll('.breakdown-item');
    items.forEach(item => {
        if (item.querySelector('.breakdown-label').textContent === label) {
            const bar = item.querySelector('.breakdown-fill');
            const valueEl = item.querySelector('.breakdown-value');
            bar.style.width = `${value * 100}%`;
            valueEl.textContent = value.toFixed(2);
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Log startup
console.log('%c🔍 DupliGuard Demo Loaded', 'color: #00ff88; font-size: 14px; font-weight: bold;');
console.log('Using backend API at:', CONFIG.API_BASE);
