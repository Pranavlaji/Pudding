# Pudding

**A Gemini 3 powered assistant that identifies duplicate Pull Requests by understanding intent and not just code diffs.**



## The Problem
Open Source maintainers waste hours reviewing PRs that solve the same problem as existing PRs but implement it differently.
'Someone takes an existing PR and duplicates it with a new title so it goes at the top of the list. Same exact fix.' ~ Shadcn

## Features
- **Intent Analysis**: Uses Gemini 3 to understand the intent of a PR, and to compare if they're primarily the same
- **Live GitHub Fetch**: Paste any PR URL to analyze it instantly. (for demo)


## How It Works
1.  **Stage 1: Fast Filter**: Quick semantic check using Bag-of-Words embeddings.
2.  **Stage 2: Context Check**: File overlap analysis (Jaccard Index).
3.  **Stage 3: Intent Extraction**: Gemini 3 extracts structured intent (Problem, Component, Behavior).
4.  **Stage 4: Reasoning**: Gemini 3 compares the *logic* of both PRs.
5.  **Stage 5: Decision**: Weighted scoring system gives a final confidence verdict.

In a real repository with multiply PRs running deep LLM analysis on every pair is too slow and expensive. We are trying a funnel approach
1.  **Broad Filter**: Ultra-fast local embeddings & file overlap filter 10,000 PRs down to ~5 candidates in milliseconds.
2.  **Deep Reasoning**: Gemini 3 then performs expensive, high-quality reasoning *only* on those top 5 candidates.

*In this demo, we visualize the full pipeline on a single pair to show how it works.*

##  Testing with Real Data
Try these duplicate PRs from React to see it in action:
- **PR #1**: `https://github.com/facebook/react/pull/26000`
- **PR #2**: `https://github.com/facebook/react/pull/26001` (or any other PR)

