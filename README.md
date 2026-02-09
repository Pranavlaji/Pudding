# DupliGuard - Intelligent Helper for Maintainers 🛡️

**A Gemini 3-powered assistant that identifies duplicate Pull Requests by understanding intent, not just code diffs.**



## 🚀 The Problem
Open Source maintainers waste hours reviewing PRs that solve the same problem as existing PRs but implement it differently. Standard tools only check for code conflicts. **DupliGuard uses LLMs to understand the semantic intent of a PR.**

## ✨ Features
- **Semantic Intent Analysis**: Uses Gemini 3 to extract the "Why" behind a PR.
- **Visual Pipeline**: Watch the AI analyze in real-time (Embeddings -> Overlap -> Intent -> Reasoning).
- **Live GitHub Fetch**: Paste any PR URL to analyze it instantly.
- **Resilient Architecture**: Auto-balances between fast local embeddings and deep LLM reasoning.

## 🛠️ How It Works
1.  **Stage 1: Fast Filter**: Quick semantic check using Bag-of-Words embeddings.
2.  **Stage 2: Context Check**: File overlap analysis (Jaccard Index).
3.  **Stage 3: Intent Extraction**: Gemini 3 extracts structured intent (Problem, Component, Behavior).
4.  **Stage 4: Reasoning**: Gemini 3 compares the *logic* of both PRs.
5.  **Stage 5: Decision**: Weighted scoring system gives a final confidence verdict.

## 🧠 Architecture Strategy: The "Funnel" Pattern
You might ask: *Why not just send everything to Gemini 3?*

In a real repository with **10,000+ PRs**, running deep LLM analysis on every pair is too slow and expensive. DupliGuard uses a **funnel approach**:
1.  **Broad Filter (Stage 1-2)**: Ultra-fast local embeddings & file overlap filter 10,000 PRs down to ~5 candidates in milliseconds.
2.  **Deep Reasoning (Stage 3-4)**: Gemini 3 then performs expensive, high-quality reasoning *only* on those top 5 candidates.

*In this demo, we visualize the full pipeline on a single pair to show how it works.*

## 📦 Tech Stack
- **AI**: Google Gemini 3 (Pro & Flash)
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Vanilla JS (Glassmorphism UI), CSS3 Animations
- **Tools**: GitHub API

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js v18+
- A Google AI Studio API Key

### Installation
1.  Clone the repo:
    ```bash
    git clone https://github.com/pranav/duplicate-pr-detector.git
    cd duplicate-pr-detector
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment:
    ```bash
    cp .env.example .env
    # Add your key to .env: GEMINI_API_KEY=your_key_here
    ```

4.  Run the Demo:
    ```bash
    npm run dev
    ```
    Open **http://localhost:3000/** in your browser.

## 🧪 Testing with Real Data
Try these duplicate PRs from React to see it in action:
- **PR #1**: `https://github.com/facebook/react/pull/26000`
- **PR #2**: `https://github.com/facebook/react/pull/26001` (or any other PR)

## 📄 License
MIT
