import { monorepoService } from '../../src/services/monorepo.js';
describe('MonorepoService', () => {
    describe('detectType', () => {
        test('should detect turbo', () => {
            expect(monorepoService.detectType(['package.json', 'turbo.json'])).toBe('turbo');
        });
        test('should detect pnpm', () => {
            expect(monorepoService.detectType(['package.json', 'pnpm-workspace.yaml'])).toBe('pnpm');
        });
        test('should return none for simple repos', () => {
            expect(monorepoService.detectType(['package.json', 'src/index.ts'])).toBe('none');
        });
    });
    describe('mapFilesToPackages', () => {
        test('should map apps/web correctly', () => {
            const files = ['apps/web/src/index.ts', 'apps/web/package.json'];
            expect(monorepoService.mapFilesToPackages(files)).toEqual(['apps/web']);
        });
        test('should map mixed packages', () => {
            const files = [
                'apps/web/src/index.ts',
                'packages/ui/Button.tsx',
                'README.md'
            ];
            const packages = monorepoService.mapFilesToPackages(files);
            expect(packages).toContain('apps/web');
            expect(packages).toContain('packages/ui');
            expect(packages).toContain('root');
        });
        test('should handle root files', () => {
            expect(monorepoService.mapFilesToPackages(['package.json'])).toEqual(['root']);
        });
    });
});
