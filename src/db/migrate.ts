import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    console.log('Starting migrations...');
    const client = await db.getClient();

    try {
        // 1. Ensure migrations table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                name VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // 2. Get applied migrations
        const { rows: appliedRows } = await client.query('SELECT name FROM migrations');
        const applied = new Set(appliedRows.map((r: { name: string }) => r.name));

        // 3. Get migration files
        const migrationDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            if (applied.has(file)) {
                // console.log(`Skipping ${file} (already applied)`);
                continue;
            }

            console.log(`Processing ${file}...`);

            // Special handling for bootstrapping: If 001 hasn't been recorded but repo_config exists, skip execution and mark as done.
            if (file.startsWith('001')) {
                const check = await client.query("SELECT to_regclass('public.repo_config')");
                if (check.rows[0].to_regclass) {
                    console.log(`Skipping execution of ${file} (schema already exists), marking as applied.`);
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    continue;
                }
            }

            // Execute migration
            try {
                const filePath = path.join(migrationDir, file);
                const sql = fs.readFileSync(filePath, 'utf8');

                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`Successfully applied ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw new Error(`Failed to apply ${file}: ${err}`);
            }
        }

        console.log('All migrations completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await db.end();
    }
}

runMigrations();
