// import { FileChange } from '../types.js';

export type MonorepoType = 'npm' | 'yarn' | 'pnpm' | 'lerna' | 'turbo' | 'none';

export class MonorepoService {
    /**
     * Detects if the repo is a monorepo and what type.
     * In a real app, this would check file existence in the repo tree.
     * For MVP, we allow passing a list of "known" root files or rely on config.
     */
    detectType(rootFiles: string[]): MonorepoType {
        if (rootFiles.includes('turbo.json')) return 'turbo';
        if (rootFiles.includes('lerna.json')) return 'lerna';
        if (rootFiles.includes('pnpm-workspace.yaml')) return 'pnpm';
        // Basic check for package.json workspaces would need content reading, skipping for now
        return 'none';
    }

    /**
     * Maps a list of file paths to their potential package names.
     * Heuristic: 
     * - Looks for `packages/xxx` or `apps/xxx` pattern.
     * - Returns unique "package" identifiers.
     * 
     * Example:
     * - `apps/web/src/index.ts` -> `@app/web` (or just `apps/web`)
     * - `packages/ui/Button.tsx` -> `@pkg/ui` (or just `packages/ui`)
     * - `RootFile.md` -> `root`
     */
    mapFilesToPackages(files: string[]): string[] {
        const packages = new Set<string>();

        for (const file of files) {
            const parts = file.split('/');

            // Standard Monorepo Patterns
            if (parts.length >= 2) {
                if (parts[0] === 'apps' || parts[0] === 'packages' || parts[0] === 'libs') {
                    // e.g. apps/web
                    packages.add(`${parts[0]}/${parts[1]}`);
                    continue;
                }
            }

            // Fallback for root or unknown
            packages.add('root');
        }

        return Array.from(packages);
    }
}

export const monorepoService = new MonorepoService();
