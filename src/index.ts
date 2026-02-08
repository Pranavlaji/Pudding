import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// import { loadConfig } from './config/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// const config = loadConfig();

import webhookRouter from './webhook/index.js';
import demoRouter from './api/demo.js';

app.use(express.json());
app.use('/api/webhook', webhookRouter);
app.use('/api/demo', demoRouter);

// Serve demo as the root
app.use(express.static(path.join(__dirname, '../demo')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Demo available at: http://localhost:${PORT}/`);
    console.log(`Demo API at: http://localhost:${PORT}/api/demo/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

