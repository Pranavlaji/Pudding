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
        const migrationFile = path.join(__dirname, 'migrations', '001_initial_schema.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log(`Running migration: ${path.basename(migrationFile)}`);
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await db.end();
    }
}

runMigrations();
