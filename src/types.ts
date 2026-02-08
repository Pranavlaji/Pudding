export interface RepoConfig {
    repoFullName: string;
    enabled: boolean;
    recencyWindowDays: number;
    cheapScoreThreshold: number;
    semanticScoreThreshold: number;
    highConfidenceThreshold: number;
    bypassAuthors: string[];
    ignoreLabels: string[];
    ignoreFiles: string[];
    isMonorepo: boolean;
    monorepoConfig: MonorepoConfig;
    airGapped: boolean;
}

export interface MonorepoConfig {
    detectionMethod: 'turbo' | 'nx' | 'pnpm' | 'lerna' | 'auto';
    sharedPackages: string[];
    packagePathMap: Record<string, string>;
}

export interface FileChange {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    previousPath?: string;
    additions: number;
    deletions: number;
}

export interface PullRequestData {
    number: number;
    repoFullName: string;
    title: string;
    body: string | null;
    headSha: string;
    author: string;
    isDraft: boolean;
    state: 'open' | 'closed' | 'merged';
    labels: string[];
    createdAt: Date;
    updatedAt: Date;
    files: FileChange[];
    packagesTouched: string[];
}

export interface PullRequestIntent {
    problemBeingSolved: string;
    affectedComponent: string;
    behavioralChange: string;
    changeType: 'bugfix' | 'feature' | 'refactor' | 'performance' | 'docs' | 'test';
    changeMagnitude: 'minor' | 'moderate' | 'major';
    keyChanges: {
        files: string[];
        functions?: string[];
    };
}
