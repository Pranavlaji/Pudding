import pg from 'pg';
import { loadConfig } from '../config/index.js';

const config = loadConfig();
const pool = new pg.Pool({
    connectionString: config.databaseUrl,
});

export const db = {
    query: (text: string, params?: (string | number | boolean | null | string[])[]) => pool.query(text, params),
    getClient: () => pool.connect(),
    end: () => pool.end(),
};
