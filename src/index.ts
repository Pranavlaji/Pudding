import express from 'express';
import dotenv from 'dotenv';
// import { loadConfig } from './config/index.js';

dotenv.config();

const app = express();
// const config = loadConfig();

import webhookRouter from './webhook/index.js';

app.use(express.json());
app.use('/api/webhook', webhookRouter);


app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
